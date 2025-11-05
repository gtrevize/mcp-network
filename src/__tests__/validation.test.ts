/**
 * Tests for input validation and anti-jailbreaking
 */
import {
  validateHost,
  validatePort,
  validateUrl,
  validateEmail,
  validateDomain,
  validateInput,
} from '../middleware/validation.js';

describe('Validation Middleware', () => {
  describe('validateHost', () => {
    test('should accept valid IPv4 addresses', () => {
      const result = validateHost('192.168.1.1');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('192.168.1.1');
    });

    test('should accept valid IPv6 addresses', () => {
      const result = validateHost('2001:db8::1');
      expect(result.valid).toBe(true);
    });

    test('should accept valid hostnames', () => {
      const result = validateHost('example.com');
      expect(result.valid).toBe(true);
    });

    test('should reject invalid hosts', () => {
      const result = validateHost('not..valid..host');
      expect(result.valid).toBe(false);
    });

    test('should reject shell injection attempts', () => {
      const result = validateHost('example.com; rm -rf /');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validatePort', () => {
    test('should accept valid port numbers', () => {
      expect(validatePort(80).valid).toBe(true);
      expect(validatePort(443).valid).toBe(true);
      expect(validatePort(8080).valid).toBe(true);
    });

    test('should reject invalid port numbers', () => {
      expect(validatePort(0).valid).toBe(false);
      expect(validatePort(65536).valid).toBe(false);
      expect(validatePort(-1).valid).toBe(false);
    });
  });

  describe('validateUrl', () => {
    test('should accept valid HTTP/HTTPS URLs', () => {
      expect(validateUrl('http://example.com').valid).toBe(true);
      expect(validateUrl('https://example.com').valid).toBe(true);
    });

    test('should reject non-HTTP URLs', () => {
      expect(validateUrl('ftp://example.com').valid).toBe(false);
      expect(validateUrl('file:///etc/passwd').valid).toBe(false);
    });

    test('should reject malicious URLs', () => {
      const result = validateUrl('http://example.com/$(whoami)');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    test('should accept valid email addresses', () => {
      expect(validateEmail('user@example.com').valid).toBe(true);
      expect(validateEmail('test.user@example.co.uk').valid).toBe(true);
    });

    test('should reject invalid email addresses', () => {
      expect(validateEmail('not-an-email').valid).toBe(false);
      expect(validateEmail('@example.com').valid).toBe(false);
    });
  });

  describe('validateDomain', () => {
    test('should accept valid domains', () => {
      expect(validateDomain('example.com').valid).toBe(true);
      expect(validateDomain('subdomain.example.com').valid).toBe(true);
    });

    test('should reject invalid domains', () => {
      expect(validateDomain('not..valid..domain').valid).toBe(false);
    });
  });

  describe('validateInput - Anti-Jailbreaking', () => {
    test('should detect shell injection patterns', () => {
      const dangerous = [
        'test; rm -rf /',
        'test | cat /etc/passwd',
        'test && whoami',
        'test `whoami`',
        'test $(whoami)',
      ];

      dangerous.forEach((input) => {
        const result = validateInput(input, 'test');
        expect(result.valid).toBe(false);
        expect(result.errors).toBeDefined();
      });
    });

    test('should detect path traversal attempts', () => {
      const result = validateInput('../../etc/passwd', 'path');
      expect(result.valid).toBe(false);
    });

    test('should reject overly long inputs', () => {
      const longInput = 'a'.repeat(10001);
      const result = validateInput(longInput, 'field');
      expect(result.valid).toBe(false);
    });

    test('should reject null bytes', () => {
      const result = validateInput('test\0', 'field');
      expect(result.valid).toBe(false);
    });

    test('should accept safe inputs', () => {
      const result = validateInput('example.com', 'hostname');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('example.com');
    });
  });
});
