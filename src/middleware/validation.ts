/**
 * Input validation and anti-jailbreaking guardrails
 */
import Joi from 'joi';
import { ValidationResult } from '../types/index.js';
import { logger } from '../logger/index.js';

/**
 * Detect potential jailbreaking or malicious patterns
 */
const MALICIOUS_PATTERNS = [
  /[;&|`$()<>]/g, // Shell injection characters
  /\.\.[\/\\]/g, // Path traversal
  /\/etc\/passwd/i,
  /\/proc\//i,
  /\beval\b/i,
  /\bexec\b/i,
  /\bsystem\b/i,
  /\brm\s+-rf/i,
  /\bmkdir\b.*\s+-p/i,
  /\bchmod\b/i,
  /\bchown\b/i,
  /\bcurl\b.*\|\s*bash/i,
  /\bwget\b.*\|\s*bash/i,
];

/**
 * Validate and sanitize input to prevent jailbreaking
 */
export function validateInput(value: string, fieldName: string): ValidationResult {
  const errors: string[] = [];

  // Check for malicious patterns
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(value)) {
      errors.push(
        `${fieldName} contains potentially malicious pattern: ${pattern.source}`
      );
      logger.warn({ fieldName, value, pattern: pattern.source }, 'Malicious pattern detected');
    }
  }

  // Additional checks
  if (value.length > 10000) {
    errors.push(`${fieldName} exceeds maximum length of 10000 characters`);
  }

  // Check for null bytes
  if (value.includes('\0')) {
    errors.push(`${fieldName} contains null bytes`);
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    sanitized: value.trim(),
  };
}

/**
 * Validate hostname or IP address
 */
export function validateHost(host: string): ValidationResult {
  const hostSchema = Joi.alternatives().try(
    // IPv4
    Joi.string().ip({ version: 'ipv4' }),
    // IPv6
    Joi.string().ip({ version: 'ipv6' }),
    // Hostname
    Joi.string()
      .hostname()
      .max(253)
  );

  const { error, value } = hostSchema.validate(host);

  if (error) {
    return {
      valid: false,
      errors: [error.message],
    };
  }

  // Additional jailbreak check
  const jailbreakCheck = validateInput(host, 'host');
  if (!jailbreakCheck.valid) {
    return jailbreakCheck;
  }

  return {
    valid: true,
    sanitized: value,
  };
}

/**
 * Validate port number
 */
export function validatePort(port: number): ValidationResult {
  const schema = Joi.number().integer().min(1).max(65535);
  const { error, value } = schema.validate(port);

  if (error) {
    return {
      valid: false,
      errors: [error.message],
    };
  }

  return {
    valid: true,
    sanitized: value,
  };
}

/**
 * Validate URL
 */
export function validateUrl(url: string): ValidationResult {
  const schema = Joi.string().uri({
    scheme: ['http', 'https'],
  });

  const { error, value } = schema.validate(url);

  if (error) {
    return {
      valid: false,
      errors: [error.message],
    };
  }

  // Additional jailbreak check
  const jailbreakCheck = validateInput(url, 'url');
  if (!jailbreakCheck.valid) {
    return jailbreakCheck;
  }

  return {
    valid: true,
    sanitized: value,
  };
}

/**
 * Validate timeout value
 */
export function validateTimeout(
  timeout: number | undefined,
  defaultTimeout: number,
  maxTimeout: number
): number {
  if (timeout === undefined) {
    return defaultTimeout;
  }

  const schema = Joi.number().integer().min(1000).max(maxTimeout);
  const { error, value } = schema.validate(timeout);

  if (error) {
    logger.warn({ timeout, error: error.message }, 'Invalid timeout, using default');
    return defaultTimeout;
  }

  return value;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const schema = Joi.string().email();
  const { error, value } = schema.validate(email);

  if (error) {
    return {
      valid: false,
      errors: [error.message],
    };
  }

  return {
    valid: true,
    sanitized: value,
  };
}

/**
 * Validate domain name
 */
export function validateDomain(domain: string): ValidationResult {
  const schema = Joi.string()
    .domain()
    .max(253);

  const { error, value } = schema.validate(domain);

  if (error) {
    return {
      valid: false,
      errors: [error.message],
    };
  }

  // Additional jailbreak check
  const jailbreakCheck = validateInput(domain, 'domain');
  if (!jailbreakCheck.valid) {
    return jailbreakCheck;
  }

  return {
    valid: true,
    sanitized: value,
  };
}

/**
 * Sanitize shell command argument
 */
export function sanitizeShellArg(arg: string): string {
  // Remove any characters that could be used for shell injection
  return arg.replace(/[;&|`$()<>'"\\]/g, '');
}

/**
 * Validate count parameter (for ping, etc.)
 */
export function validateCount(count: number | undefined, defaultCount: number, maxCount: number): number {
  if (count === undefined) {
    return defaultCount;
  }

  const schema = Joi.number().integer().min(1).max(maxCount);
  const { error, value } = schema.validate(count);

  if (error) {
    logger.warn({ count, error: error.message }, 'Invalid count, using default');
    return defaultCount;
  }

  return value;
}
