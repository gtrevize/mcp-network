/**
 * DNS resolution tool implementation
 */
import { DnsOptions, ToolResult } from '../types/index.js';
import { validateHost, validateTimeout } from '../middleware/validation.js';
import { executeCommand } from '../utils/helpers.js';
import { logger } from '../logger/index.js';
import { buildDnsCommand, checkToolAvailability } from '../utils/platform.js';
import { validateDnsRecords } from '../utils/output-validator.js';

const DEFAULT_TIMEOUT = 5000;
const MAX_TIMEOUT = 30000;

export async function dnsLookup(options: DnsOptions): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Sanity check: verify DNS tools are available
    const digCheck = checkToolAvailability('dig');
    const nslookupCheck = checkToolAvailability('nslookup');

    if (!digCheck.available && !nslookupCheck.available) {
      return {
        success: false,
        error: 'No DNS query tools available. Install dig or nslookup.',
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
    const recordType = options.recordType || 'A';
    const timeout = validateTimeout(options.timeout, DEFAULT_TIMEOUT, MAX_TIMEOUT);

    // Build platform-specific DNS command
    let command = buildDnsCommand(target, recordType);

    // Add nameserver if specified (only works with dig)
    if (options.nameserver && digCheck.available) {
      const nsValidation = validateHost(options.nameserver);
      if (nsValidation.valid) {
        command += ` @${nsValidation.sanitized}`;
      }
    }

    // Add timeout for dig
    if (digCheck.available) {
      command += ' +time=5';
    }

    logger.debug({ command, target, recordType, timeout }, 'Performing DNS lookup');

    const { stdout } = await executeCommand(command, timeout);

    const records = parseDnsOutput(stdout, recordType);

    // Validate parsed records
    const validation = validateDnsRecords(records);
    if (!validation.valid) {
      logger.warn({ errors: validation.errors, warnings: validation.warnings, records }, 'DNS records validation failed');
      return {
        success: false,
        error: `Invalid DNS records: ${validation.errors.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn({ warnings: validation.warnings, records }, 'DNS records validation warnings');
    }

    return {
      success: true,
      data: {
        target,
        recordType,
        records,
        output: stdout,
      },
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error.message, options }, 'DNS lookup failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

function parseDnsOutput(output: string, _recordType: string): any[] {
  const records: any[] = [];
  const lines = output.split('\n');
  let inAnswerSection = false;

  for (const line of lines) {
    if (line.includes(';; ANSWER SECTION:')) {
      inAnswerSection = true;
      continue;
    }

    if (inAnswerSection && line.trim() === '') {
      break;
    }

    if (inAnswerSection && !line.startsWith(';')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        records.push({
          name: parts[0],
          ttl: parseInt(parts[1]),
          class: parts[2],
          type: parts[3],
          value: parts.slice(4).join(' '),
        });
      }
    }
  }

  return records;
}
