/**
 * Ping tool implementation
 */
import { PingOptions, ToolResult } from '../types/index.js';
import { validateHost, validateCount, validateTimeout } from '../middleware/validation.js';
import { executeCommand } from '../utils/helpers.js';
import { logger } from '../logger/index.js';

const DEFAULT_TIMEOUT = 5000;
const MAX_TIMEOUT = 30000;
const DEFAULT_COUNT = 4;
const MAX_COUNT = 20;

export async function ping(options: PingOptions): Promise<ToolResult> {
  const startTime = Date.now();

  try {
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

    // Build ping command
    const isLinux = process.platform === 'linux';
    const ipv6Flag = options.ipv6 ? '6' : '';
    const command = isLinux
      ? `ping${ipv6Flag} -c ${count} -W ${Math.ceil(timeout / 1000)} ${target}`
      : `ping${ipv6Flag} -n ${count} -w ${timeout} ${target}`;

    logger.debug({ command, target, count, timeout }, 'Executing ping');

    const { stdout } = await executeCommand(command, timeout + 5000);

    // Parse ping output
    const stats = parsePingOutput(stdout);

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

  // Parse packets transmitted/received
  const packetMatch = output.match(/(\d+) packets transmitted, (\d+).*received, ([\d.]+)% packet loss/);
  if (packetMatch) {
    stats.packetsSent = parseInt(packetMatch[1]);
    stats.packetsReceived = parseInt(packetMatch[2]);
    stats.packetLoss = parseFloat(packetMatch[3]);
  }

  // Parse RTT statistics
  const rttMatch = output.match(/min\/avg\/max(?:\/mdev)?\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)/);
  if (rttMatch) {
    stats.minRtt = parseFloat(rttMatch[1]);
    stats.avgRtt = parseFloat(rttMatch[2]);
    stats.maxRtt = parseFloat(rttMatch[3]);
  }

  return stats;
}
