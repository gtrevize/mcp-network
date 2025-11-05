/**
 * Traceroute tool implementation
 */
import { TracerouteOptions, ToolResult } from '../types/index.js';
import { validateHost, validateTimeout } from '../middleware/validation.js';
import { executeCommand } from '../utils/helpers.js';
import { logger } from '../logger/index.js';

const DEFAULT_TIMEOUT = 30000;
const MAX_TIMEOUT = 60000;
const DEFAULT_MAX_HOPS = 30;
const MAX_MAX_HOPS = 64;

export async function traceroute(options: TracerouteOptions): Promise<ToolResult> {
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
    const maxHops = Math.min(options.maxHops || DEFAULT_MAX_HOPS, MAX_MAX_HOPS);
    const timeout = validateTimeout(options.timeout, DEFAULT_TIMEOUT, MAX_TIMEOUT);

    // Build traceroute command
    const isLinux = process.platform === 'linux';
    const command = isLinux
      ? `traceroute -m ${maxHops} -w ${Math.ceil(timeout / 1000)} ${options.ipv6 ? '-6' : ''} ${target}`
      : `tracert ${options.ipv6 ? '-6' : ''} -h ${maxHops} -w ${timeout} ${target}`;

    logger.debug({ command, target, maxHops, timeout }, 'Executing traceroute');

    const { stdout } = await executeCommand(command, timeout + 5000);

    const hops = parseTracerouteOutput(stdout);

    return {
      success: true,
      data: {
        target,
        maxHops,
        hops,
        output: stdout,
      },
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error.message, options }, 'Traceroute failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

function parseTracerouteOutput(output: string): any[] {
  const hops: any[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Match hop number at start of line
    const hopMatch = line.match(/^\s*(\d+)\s+(.+)/);
    if (hopMatch) {
      const hopNumber = parseInt(hopMatch[1]);
      const hopData = hopMatch[2];

      // Extract IP/hostname and timings
      const ipMatch = hopData.match(/([a-zA-Z0-9.-]+)\s+\(([0-9.:]+)\)/);
      const timings = [...hopData.matchAll(/([\d.]+)\s*ms/g)].map(m => parseFloat(m[1]));

      hops.push({
        hop: hopNumber,
        hostname: ipMatch?.[1] || null,
        ip: ipMatch?.[2] || null,
        timings,
        avgTime: timings.length > 0 ? timings.reduce((a, b) => a + b) / timings.length : null,
      });
    }
  }

  return hops;
}
