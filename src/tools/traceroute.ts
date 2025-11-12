/**
 * Traceroute tool implementation
 */
import { TracerouteOptions, ToolResult } from '../types/index.js';
import { validateHost, validateTimeout } from '../middleware/validation.js';
import { executeCommand } from '../utils/helpers.js';
import { logger } from '../logger/index.js';
import { checkToolAvailability, buildTracerouteCommand, getPlatform } from '../utils/platform.js';
import { validateTracerouteHops } from '../utils/output-validator.js';

const DEFAULT_TIMEOUT = 30000;
const MAX_TIMEOUT = 60000;
const DEFAULT_MAX_HOPS = 30;
const MAX_MAX_HOPS = 64;

export async function traceroute(options: TracerouteOptions): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Sanity check: verify traceroute is available
    const toolCheck = checkToolAvailability('traceroute');
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
    const maxHops = Math.min(options.maxHops || DEFAULT_MAX_HOPS, MAX_MAX_HOPS);
    const timeout = validateTimeout(options.timeout, DEFAULT_TIMEOUT, MAX_TIMEOUT);

    // Build platform-specific traceroute command
    const currentPlatform = getPlatform();
    let command: string;

    try {
      command = buildTracerouteCommand(target, maxHops, timeout);

      // Add IPv6 flag if needed
      if (options.ipv6) {
        if (currentPlatform === 'windows') {
          command = command.replace('tracert', 'tracert -6');
        } else {
          command = command.replace('traceroute', 'traceroute -6');
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to build traceroute command',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    logger.debug({ command, target, maxHops, timeout, platform: currentPlatform }, 'Executing traceroute');

    const { stdout } = await executeCommand(command, timeout + 5000);

    const hops = parseTracerouteOutput(stdout);

    // Validate parsed hops
    const validation = validateTracerouteHops(hops);
    if (!validation.valid) {
      logger.warn({ errors: validation.errors, warnings: validation.warnings, hops }, 'Traceroute hops validation failed');
      return {
        success: false,
        error: `Invalid traceroute output: ${validation.errors.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn({ warnings: validation.warnings, hops }, 'Traceroute hops validation warnings');
    }

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
  const currentPlatform = getPlatform();

  for (const line of lines) {
    // Match hop number at start of line
    const hopMatch = line.match(/^\s*(\d+)\s+(.+)/);
    if (!hopMatch) continue;

    const hopNumber = parseInt(hopMatch[1]);
    const hopData = hopMatch[2];

    let hostname: string | null = null;
    let ip: string | null = null;
    let timings: number[] = [];

    // Check for timeout indicators
    if (hopData.includes('* * *') || hopData.includes('Request timed out')) {
      hops.push({
        hop: hopNumber,
        hostname: null,
        ip: null,
        timings: [],
        avgTime: null,
        timeout: true,
      });
      continue;
    }

    if (currentPlatform === 'windows') {
      // Windows tracert format: "  1     1 ms     1 ms     1 ms  router.local [192.168.1.1]"
      // Extract timings first (they come before hostname)
      timings = [...hopData.matchAll(/([\d.]+)\s*ms/g)].map(m => parseFloat(m[1]));

      // Extract hostname and IP - Windows uses square brackets
      const ipMatch = hopData.match(/([a-zA-Z0-9.-]+)\s+\[([0-9.:]+)\]/);
      if (ipMatch) {
        hostname = ipMatch[1];
        ip = ipMatch[2];
      } else {
        // Sometimes just an IP without hostname
        const ipOnlyMatch = hopData.match(/([0-9.:]+)/);
        if (ipOnlyMatch) {
          ip = ipOnlyMatch[1];
        }
      }
    } else {
      // Unix format: " 1  router.local (192.168.1.1)  1.234 ms  1.123 ms  1.056 ms"
      // Extract IP/hostname - Unix uses parentheses
      const ipMatch = hopData.match(/([a-zA-Z0-9.-]+)\s+\(([0-9.:]+)\)/);
      if (ipMatch) {
        hostname = ipMatch[1];
        ip = ipMatch[2];
      } else {
        // Sometimes just an IP without hostname
        const ipOnlyMatch = hopData.match(/([0-9.:]+)/);
        if (ipOnlyMatch && !hopData.includes('ms')) {
          ip = ipOnlyMatch[1];
        }
      }

      // Extract timings
      timings = [...hopData.matchAll(/([\d.]+)\s*ms/g)].map(m => parseFloat(m[1]));
    }

    hops.push({
      hop: hopNumber,
      hostname,
      ip,
      timings,
      avgTime: timings.length > 0 ? timings.reduce((a, b) => a + b) / timings.length : null,
    });
  }

  return hops;
}
