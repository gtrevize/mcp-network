/**
 * Ping tool implementation
 */
import { PingOptions, ToolResult } from '../types/index.js';
import { validateHost, validateCount, validateTimeout } from '../middleware/validation.js';
import { executeCommand } from '../utils/helpers.js';
import { logger } from '../logger/index.js';
import { checkToolAvailability, buildPingCommand, getPlatform } from '../utils/platform.js';
import { validatePingStats } from '../utils/output-validator.js';

const DEFAULT_TIMEOUT = 5000;
const MAX_TIMEOUT = 30000;
const DEFAULT_COUNT = 4;
const MAX_COUNT = 20;

export async function ping(options: PingOptions): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Sanity check: verify ping is available
    const toolCheck = checkToolAvailability('ping');
    if (!toolCheck.available) {
      return {
        success: false,
        error: `${toolCheck.message}. ${toolCheck.installHint || ''}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Validate input
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
    const count = validateCount(options.count, DEFAULT_COUNT, MAX_COUNT);
    const timeout = validateTimeout(options.timeout, DEFAULT_TIMEOUT, MAX_TIMEOUT);

    // Build platform-specific ping command
    const currentPlatform = getPlatform();
    const ipv6Flag = options.ipv6 ? '6' : '';
    let command: string;

    try {
      // Use platform-aware command builder
      const baseCommand = buildPingCommand(target, count, timeout);
      // Add IPv6 flag if needed
      command = baseCommand.replace('ping', `ping${ipv6Flag}`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to build ping command',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    logger.debug({ command, target, count, timeout, platform: currentPlatform }, 'Executing ping');

    const { stdout } = await executeCommand(command, timeout + 5000);

    // Parse ping output
    const stats = parsePingOutput(stdout);

    // Validate parsed statistics
    const validation = validatePingStats(stats);
    if (!validation.valid) {
      logger.warn({ errors: validation.errors, warnings: validation.warnings, stats }, 'Ping statistics validation failed');
      return {
        success: false,
        error: `Invalid ping statistics: ${validation.errors.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn({ warnings: validation.warnings, stats }, 'Ping statistics validation warnings');
    }

    return {
      success: true,
      data: {
        target,
        output: stdout,
        statistics: stats,
      },
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error.message, options }, 'Ping failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

function parsePingOutput(output: string): any {
  const stats: any = {
    packetsSent: 0,
    packetsReceived: 0,
    packetLoss: 0,
    minRtt: 0,
    avgRtt: 0,
    maxRtt: 0,
  };

  const currentPlatform = getPlatform();

  if (currentPlatform === 'windows') {
    // Windows format: "Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)"
    const packetMatch = output.match(/Sent\s*=\s*(\d+),\s*Received\s*=\s*(\d+),\s*Lost\s*=\s*\d+\s*\((\d+)%/);
    if (packetMatch) {
      stats.packetsSent = parseInt(packetMatch[1]);
      stats.packetsReceived = parseInt(packetMatch[2]);
      stats.packetLoss = parseFloat(packetMatch[3]);
    }

    // Windows RTT format: "Minimum = 10ms, Maximum = 12ms, Average = 11ms"
    const rttMatch = output.match(/Minimum\s*=\s*([\d.]+)ms,\s*Maximum\s*=\s*([\d.]+)ms,\s*Average\s*=\s*([\d.]+)ms/);
    if (rttMatch) {
      stats.minRtt = parseFloat(rttMatch[1]);
      stats.maxRtt = parseFloat(rttMatch[2]);
      stats.avgRtt = parseFloat(rttMatch[3]);
    }
  } else {
    // Unix-like (Linux/macOS) format: "4 packets transmitted, 4 received, 0% packet loss"
    // Also handles "4 packets transmitted, 4 packets received, 0.0% packet loss" (macOS)
    const packetMatch = output.match(/(\d+) packets transmitted,\s*(\d+)(?: packets)? received,\s*([\d.]+)% packet loss/);
    if (packetMatch) {
      stats.packetsSent = parseInt(packetMatch[1]);
      stats.packetsReceived = parseInt(packetMatch[2]);
      stats.packetLoss = parseFloat(packetMatch[3]);
    }

    // Unix-like RTT format variations:
    // Linux: "rtt min/avg/max/mdev = 10.5/11.1/11.8/0.5 ms"
    // macOS: "round-trip min/avg/max/stddev = 10.5/11.1/11.8/0.5 ms"
    const rttMatch = output.match(/(?:rtt|round-trip)\s+min\/avg\/max(?:\/(?:mdev|stddev))?\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/);
    if (rttMatch) {
      stats.minRtt = parseFloat(rttMatch[1]);
      stats.avgRtt = parseFloat(rttMatch[2]);
      stats.maxRtt = parseFloat(rttMatch[3]);
    }
  }

  return stats;
}
