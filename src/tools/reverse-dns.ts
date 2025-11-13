/**
 * Reverse DNS lookup tool
 * Performs reverse DNS lookups (PTR record queries) to find hostnames associated with an IP address
 */
import { ReverseDnsOptions, ReverseDnsResult, ToolResult } from '../types/index.js';
import { logger } from '../logger/index.js';
import { validateHost } from '../middleware/validation.js';
import { executeCommand } from '../utils/helpers.js';

/**
 * Convert IPv4 address to in-addr.arpa format for PTR query
 * Example: 8.8.8.8 -> 8.8.8.8.in-addr.arpa
 */
function ipToArpa(ip: string): string {
  if (ip.includes(':')) {
    // IPv6 - convert to ip6.arpa format
    // This is more complex, we'll use dig's built-in -x flag which handles it
    return ip;
  } else {
    // IPv4 - convert to in-addr.arpa format
    const octets = ip.split('.');
    return `${octets[3]}.${octets[2]}.${octets[1]}.${octets[0]}.in-addr.arpa`;
  }
}

/**
 * Perform reverse DNS lookup using dig
 */
async function performReverseLookup(ip: string, timeout: number): Promise<string[]> {
  try {
    // Use dig with -x flag for automatic PTR query
    const command = `dig +short -x ${ip}`;
    logger.debug({ command, ip }, 'Executing reverse DNS lookup');

    const { stdout } = await executeCommand(command, timeout);

    // Parse results - dig returns hostnames, one per line
    const hostnames = stdout
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith(';'))
      .map(hostname => {
        // Remove trailing dot if present
        return hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
      });

    return hostnames;
  } catch (error: any) {
    logger.debug({ error: error.message, ip }, 'Reverse DNS lookup failed');
    throw error;
  }
}

/**
 * Main reverse DNS lookup function
 */
export async function reverseDnsLookup(
  options: ReverseDnsOptions
): Promise<ToolResult<ReverseDnsResult>> {
  const startTime = Date.now();

  try {
    // Validate IP address
    const validation = validateHost(options.ip);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid IP address: ${validation.errors?.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const ip = validation.sanitized!;
    const timeout = options.timeout || 10000;

    logger.debug({ ip, timeout }, 'Starting reverse DNS lookup');

    // Perform the reverse lookup
    const hostnames = await performReverseLookup(ip, timeout);

    // Generate the PTR record name for reference
    const ptrRecord = ipToArpa(ip);

    const result: ReverseDnsResult = {
      ip,
      hostnames,
      ptrRecord: ip.includes(':') ? undefined : ptrRecord,
    };

    if (hostnames.length === 0) {
      logger.info({ ip }, 'No PTR records found for IP address');
    } else {
      logger.info({ ip, hostnames, count: hostnames.length }, 'Successfully resolved PTR records');
    }

    return {
      success: true,
      data: result,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error.message, ip: options.ip }, 'Reverse DNS lookup failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}
