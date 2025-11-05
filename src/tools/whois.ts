/**
 * WHOIS lookup tool implementation
 */
import { WhoisOptions, ToolResult } from '../types/index.js';
import { validateHost, validateDomain, validateTimeout } from '../middleware/validation.js';
import { executeCommand } from '../utils/helpers.js';
import { logger } from '../logger/index.js';

const DEFAULT_TIMEOUT = 10000;
const MAX_TIMEOUT = 30000;

export async function whois(options: WhoisOptions): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Validate input - can be domain or IP
    let target: string;
    const hostValidation = validateHost(options.target);
    const domainValidation = validateDomain(options.target);

    if (!hostValidation.valid && !domainValidation.valid) {
      return {
        success: false,
        error: `Invalid target: must be a valid IP address or domain name`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    target = hostValidation.valid ? hostValidation.sanitized! : domainValidation.sanitized!;
    const timeout = validateTimeout(options.timeout, DEFAULT_TIMEOUT, MAX_TIMEOUT);

    logger.debug({ target, timeout }, 'Performing WHOIS lookup');

    const command = `whois ${target}`;
    const { stdout } = await executeCommand(command, timeout);

    const parsed = parseWhoisOutput(stdout);

    return {
      success: true,
      data: {
        target,
        raw: stdout,
        parsed,
      },
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error.message, options }, 'WHOIS lookup failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

function parseWhoisOutput(output: string): any {
  const parsed: any = {
    registrar: null,
    createdDate: null,
    expiryDate: null,
    updatedDate: null,
    nameServers: [],
    status: [],
  };

  const lines = output.split('\n');

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.includes('registrar:')) {
      parsed.registrar = line.split(':')[1]?.trim();
    } else if (lower.includes('creation date:') || lower.includes('created:')) {
      parsed.createdDate = line.split(':').slice(1).join(':').trim();
    } else if (lower.includes('expir') && lower.includes('date:')) {
      parsed.expiryDate = line.split(':').slice(1).join(':').trim();
    } else if (lower.includes('updated date:') || lower.includes('last updated:')) {
      parsed.updatedDate = line.split(':').slice(1).join(':').trim();
    } else if (lower.includes('name server:') || lower.includes('nserver:')) {
      const ns = line.split(':')[1]?.trim();
      if (ns) parsed.nameServers.push(ns);
    } else if (lower.includes('status:')) {
      const status = line.split(':')[1]?.trim();
      if (status) parsed.status.push(status);
    }
  }

  return parsed;
}
