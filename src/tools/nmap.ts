/**
 * Port scanner (nmap) tool with throttling
 */
import { NmapOptions, ToolResult } from '../types/index.js';
import { validateHost, validateTimeout } from '../middleware/validation.js';
import { executeCommand } from '../utils/helpers.js';
import { logger } from '../logger/index.js';

const DEFAULT_TIMEOUT = 60000;
const MAX_TIMEOUT = 300000;
const DEFAULT_THROTTLE_MS = 100; // 100ms between port scans
const MIN_THROTTLE_MS = 50;

export async function portScan(options: NmapOptions): Promise<ToolResult> {
  const startTime = Date.now();

  try {
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
    const throttleMs = Math.max(options.throttleMs || DEFAULT_THROTTLE_MS, MIN_THROTTLE_MS);
    const ports = options.ports || '1-1000';
    const scanType = options.scanType || 'tcp';

    logger.debug({ target, ports, scanType, throttleMs }, 'Starting port scan');

    // Build nmap command with throttling
    let command = `nmap -Pn --host-timeout ${Math.ceil(timeout / 1000)}s`;

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

    // Add throttling
    command += ` --max-rate ${Math.floor(1000 / throttleMs)}`;

    // Add target
    command += ` ${target}`;

    logger.info({ command }, 'Executing nmap scan');

    const { stdout } = await executeCommand(command, timeout + 10000);

    const openPorts = parseNmapOutput(stdout);

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
