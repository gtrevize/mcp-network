/**
 * WHOIS lookup tool implementation
 */
import { WhoisOptions, ToolResult } from '../types/index.js';
import { validateHost, validateDomain, validateTimeout } from '../middleware/validation.js';
import { executeCommand } from '../utils/helpers.js';
import { logger } from '../logger/index.js';
import { checkToolAvailability } from '../utils/platform.js';
import { validateWhoisData } from '../utils/output-validator.js';

const DEFAULT_TIMEOUT = 10000;
const MAX_TIMEOUT = 30000;

export async function whois(options: WhoisOptions): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Sanity check: verify whois is available
    const toolCheck = checkToolAvailability('whois');
    if (!toolCheck.available) {
      return {
        success: false,
        error: `${toolCheck.message}. ${toolCheck.installHint || ''}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

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

    // Validate parsed WHOIS data
    const validation = validateWhoisData(parsed);
    if (!validation.valid) {
      logger.warn({ errors: validation.errors, warnings: validation.warnings, parsed }, 'WHOIS data validation failed');
      return {
        success: false,
        error: `Invalid WHOIS data: ${validation.errors.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn({ warnings: validation.warnings, parsed }, 'WHOIS data validation warnings');
    }

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
    domain: null,
    registrar: null,
    registrarUrl: null,
    registrarWhois: null,
    registrarAbuseEmail: null,
    registrarAbusePhone: null,
    organization: null,
    registrant: null,
    admin: null,
    tech: null,
    createdDate: null,
    expiryDate: null,
    updatedDate: null,
    nameServers: [],
    status: [],
    dnssec: null,
    emails: [],
    phones: [],
  };

  const lines = output.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%') || trimmed.startsWith('#')) continue;

    const colonIndex = line.indexOf(':');

    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    const lowerKey = key.toLowerCase();

    // Domain
    if (lowerKey === 'domain' || lowerKey === 'domain name') {
      parsed.domain = value;
    }

    // Registrar information
    else if (lowerKey === 'registrar' && !parsed.registrar) {
      parsed.registrar = value;
    }
    else if (lowerKey === 'registrar url' || lowerKey === 'registrar whois server') {
      parsed.registrarUrl = value;
    }
    else if (lowerKey === 'whois' || lowerKey === 'whois server') {
      parsed.registrarWhois = value;
    }
    else if (lowerKey === 'registrar abuse contact email') {
      parsed.registrarAbuseEmail = value;
    }
    else if (lowerKey === 'registrar abuse contact phone') {
      parsed.registrarAbusePhone = value;
    }

    // Organization
    else if (lowerKey === 'organisation' || lowerKey === 'organization' || lowerKey === 'org' || lowerKey === 'registrant organization') {
      parsed.organization = value;
    }

    // Registrant/Admin/Tech contacts
    else if (lowerKey === 'registrant name' || lowerKey === 'registrant') {
      parsed.registrant = value;
    }
    else if (lowerKey === 'admin name' || lowerKey === 'administrative contact') {
      parsed.admin = value;
    }
    else if (lowerKey === 'tech name' || lowerKey === 'technical contact') {
      parsed.tech = value;
    }

    // Dates
    else if (lowerKey === 'creation date' || lowerKey === 'created' || lowerKey === 'registered' || lowerKey === 'registration time') {
      parsed.createdDate = value;
    }
    else if (lowerKey.includes('expir') && lowerKey.includes('date')) {
      parsed.expiryDate = value;
    }
    else if (lowerKey === 'updated date' || lowerKey === 'last updated' || lowerKey === 'modified') {
      parsed.updatedDate = value;
    }

    // Name servers
    else if (lowerKey === 'name server' || lowerKey === 'nserver' || lowerKey === 'nameserver') {
      if (value && !parsed.nameServers.includes(value)) {
        parsed.nameServers.push(value);
      }
    }

    // Status
    else if (lowerKey === 'status' || lowerKey === 'domain status') {
      if (value && !parsed.status.includes(value)) {
        parsed.status.push(value);
      }
    }

    // DNSSEC
    else if (lowerKey === 'dnssec' || lowerKey === 'ds-rdata') {
      if (!parsed.dnssec) {
        parsed.dnssec = value;
      } else {
        parsed.dnssec += '; ' + value;
      }
    }

    // Extract emails
    const emailMatch = value.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch && !parsed.emails.includes(emailMatch[0])) {
      parsed.emails.push(emailMatch[0]);
    }

    // Extract phone numbers
    const phoneMatch = value.match(/\+?\d[\d\s-()]{7,}/);
    if (phoneMatch && !parsed.phones.includes(phoneMatch[0].trim())) {
      parsed.phones.push(phoneMatch[0].trim());
    }
  }

  return parsed;
}
