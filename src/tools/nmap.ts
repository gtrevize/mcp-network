/**
 * Port scanner (nmap) tool with throttling
 */
import { NmapOptions, ToolResult } from '../types/index.js';
import { validateHost, validateTimeout } from '../middleware/validation.js';
import { executeCommand } from '../utils/helpers.js';
import { logger } from '../logger/index.js';
import { checkToolAvailability, getNmapCommand } from '../utils/platform.js';
import { validatePortScanResults } from '../utils/output-validator.js';

const DEFAULT_TIMEOUT = 60000;
const MAX_TIMEOUT = 300000;
const DEFAULT_THROTTLE_MS = 20; // 20ms = 50 packets/sec (faster default)

export async function portScan(options: NmapOptions): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Sanity check: verify nmap is available
    const toolCheck = checkToolAvailability('nmap');
    if (!toolCheck.available) {
      return {
        success: false,
        error: `${toolCheck.message}. ${toolCheck.installHint || ''}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Validate input - ONLY single IP address allowed
    const hostValidation = validateHost(options.target);
    if (!hostValidation.valid) {
      return {
        success: false,
        error: `Invalid target: ${hostValidation.errors?.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const target = hostValidation.sanitized!;

    // Ensure it's a single IP, not a hostname or range
    if (!isIpAddress(target)) {
      return {
        success: false,
        error: 'Port scanner only accepts a single IP address (no hostnames or ranges)',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const timeout = validateTimeout(options.timeout, DEFAULT_TIMEOUT, MAX_TIMEOUT);
    const ports = options.ports || '1-1000';
    const scanType = options.scanType || 'tcp';

    // Calculate smart throttling based on port count and timeout
    const portCount = estimatePortCount(ports);
    const maxRate = calculateOptimalRate(portCount, timeout, options.throttleMs);
    const throttleMs = options.throttleMs || DEFAULT_THROTTLE_MS;

    logger.debug({ target, ports, scanType, throttleMs, maxRate, portCount }, 'Starting port scan');

    // Build nmap command with throttling
    const nmapCmd = getNmapCommand();
    let command = `${nmapCmd} -Pn --host-timeout ${Math.ceil(timeout / 1000)}s`;

    // Add scan type
    switch (scanType) {
      case 'syn':
        command += ' -sS'; // SYN scan (requires root)
        break;
      case 'udp':
        command += ' -sU'; // UDP scan
        break;
      default:
        command += ' -sT'; // TCP connect scan
    }

    // Add port range
    command += ` -p ${ports}`;

    // Add throttling - use calculated max rate
    command += ` --max-rate ${maxRate}`;

    // Add target
    command += ` ${target}`;

    logger.info({ command }, 'Executing nmap scan');

    const { stdout } = await executeCommand(command, timeout + 10000);

    const openPorts = parseNmapOutput(stdout);

    // Validate parsed port scan results
    const validation = validatePortScanResults(openPorts);
    if (!validation.valid) {
      logger.warn({ errors: validation.errors, warnings: validation.warnings, openPorts }, 'Port scan results validation failed');
      return {
        success: false,
        error: `Invalid port scan results: ${validation.errors.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn({ warnings: validation.warnings, openPorts }, 'Port scan results validation warnings');
    }

    return {
      success: true,
      data: {
        target,
        ports: options.ports,
        scanType,
        openPorts,
        output: stdout,
      },
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error.message, options }, 'Port scan failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

function parseNmapOutput(output: string): any[] {
  const openPorts: any[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Match port lines like: "80/tcp   open  http"
    const match = line.match(/^(\d+)\/(tcp|udp)\s+(open|filtered)\s+(.*)$/);
    if (match) {
      openPorts.push({
        port: parseInt(match[1]),
        protocol: match[2],
        state: match[3],
        service: match[4].trim(),
      });
    }
  }

  return openPorts;
}

/**
 * Estimate the number of ports to scan based on port specification
 */
function estimatePortCount(ports: string): number {
  let count = 0;
  const ranges = ports.split(',');

  for (const range of ranges) {
    if (range.includes('-')) {
      const [start, end] = range.split('-').map(p => parseInt(p.trim()));
      count += (end - start + 1);
    } else {
      count += 1;
    }
  }

  return count;
}

/**
 * Calculate optimal max-rate for nmap based on port count and timeout
 * Ensures scan completes within timeout while respecting user throttling
 */
function calculateOptimalRate(portCount: number, timeoutMs: number, userThrottleMs?: number): number {
  // If user specified throttle, honor it
  if (userThrottleMs) {
    return Math.floor(1000 / userThrottleMs);
  }

  // Otherwise, calculate rate to complete within 80% of timeout (safety margin)
  const timeoutSec = timeoutMs / 1000;
  const safeTimeout = timeoutSec * 0.8;
  const requiredRate = Math.ceil(portCount / safeTimeout);

  // Set reasonable bounds: min 10 packets/sec, max 100 packets/sec
  const minRate = 10;
  const maxRate = 100;

  return Math.max(minRate, Math.min(maxRate, requiredRate));
}

function isIpAddress(target: string): boolean {
  // Check if it's an IPv4 address
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(target)) {
    const parts = target.split('.');
    return parts.every(part => {
      const num = parseInt(part);
      return num >= 0 && num <= 255;
    });
  }

  // Check if it's an IPv6 address
  const ipv6Regex = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/i;
  const ipv6RegexCompressed = /^([\da-f]{0,4}:){2,7}[\da-f]{0,4}$/i;

  return ipv6Regex.test(target) || ipv6RegexCompressed.test(target);
}
