/**
 * Tests for JWT authentication and RBAC
 */
import {
  verifyServerToken,
  generateServerToken,
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
} from '../auth/jwt.js';
import {
  generateApiKey,
} from '../auth/apikey.js';

describe('Authentication and Authorization', () => {
  describe('Server JWT Token', () => {
    test('should generate a valid server token', () => {
      const token = generateServerToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('should verify valid server tokens', () => {
      const token = generateServerToken();
      const isValid = verifyServerToken(token);
      expect(isValid).toBe(true);
    });

    test('should reject invalid server tokens', () => {
      const isValid = verifyServerToken('invalid-token');
      expect(isValid).toBe(false);
    });

    test('should reject tokens with wrong type', () => {
      // Create a token with wrong type
      const jwt = require('jsonwebtoken');
      const wrongToken = jwt.sign({ type: 'user' }, process.env.JWT_SECRET || 'test-secret');
      const isValid = verifyServerToken(wrongToken);
      expect(isValid).toBe(false);
    });
  });

  describe('API Keys', () => {
    test('should generate API keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();

      expect(key1).toBeDefined();
      expect(typeof key1).toBe('string');
      expect(key1.length).toBe(64); // 32 bytes * 2 (hex)
      expect(key1).not.toBe(key2); // Keys should be unique
    });

    test('API keys should be valid hex strings', () => {
      const key = generateApiKey();
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });
  });

  describe('RBAC Permissions', () => {
    test('admin role should have all permissions', () => {
      const adminPerms = ROLE_PERMISSIONS[ROLES.ADMIN];
      expect(adminPerms).toContain(PERMISSIONS.PING);
      expect(adminPerms).toContain(PERMISSIONS.PORT_SCAN);
      expect(adminPerms).toContain(PERMISSIONS.TCPDUMP);
      expect(adminPerms).toContain(PERMISSIONS.API_TEST);
    });

    test('developer role should have limited permissions', () => {
      const devPerms = ROLE_PERMISSIONS[ROLES.DEVELOPER];
      expect(devPerms).toContain(PERMISSIONS.PING);
      expect(devPerms).toContain(PERMISSIONS.API_TEST);
      expect(devPerms).not.toContain(PERMISSIONS.PORT_SCAN);
      expect(devPerms).not.toContain(PERMISSIONS.TCPDUMP);
    });

    test('readonly role should have minimal permissions', () => {
      const readonlyPerms = ROLE_PERMISSIONS[ROLES.READONLY];
      expect(readonlyPerms).toContain(PERMISSIONS.PING);
      expect(readonlyPerms).toContain(PERMISSIONS.DNS);
      expect(readonlyPerms).not.toContain(PERMISSIONS.PORT_SCAN);
    });

    test('network_engineer role should have network diagnostic permissions', () => {
      const netEngPerms = ROLE_PERMISSIONS[ROLES.NETWORK_ENGINEER];
      expect(netEngPerms).toContain(PERMISSIONS.PING);
      expect(netEngPerms).toContain(PERMISSIONS.TRACEROUTE);
      expect(netEngPerms).toContain(PERMISSIONS.PORT_SCAN);
      expect(netEngPerms).toContain(PERMISSIONS.TCPDUMP);
    });

    test('auditor role should have read-only network permissions', () => {
      const auditorPerms = ROLE_PERMISSIONS[ROLES.AUDITOR];
      expect(auditorPerms).toContain(PERMISSIONS.PING);
      expect(auditorPerms).toContain(PERMISSIONS.DNS);
      expect(auditorPerms).toContain(PERMISSIONS.WHOIS);
      expect(auditorPerms).not.toContain(PERMISSIONS.PORT_SCAN);
      expect(auditorPerms).not.toContain(PERMISSIONS.TCPDUMP);
    });
  });

  describe('Roles Configuration', () => {
    test('all required roles should be defined', () => {
      expect(ROLES.ADMIN).toBeDefined();
      expect(ROLES.NETWORK_ENGINEER).toBeDefined();
      expect(ROLES.DEVELOPER).toBeDefined();
      expect(ROLES.AUDITOR).toBeDefined();
      expect(ROLES.READONLY).toBeDefined();
    });

    test('all permissions should be defined', () => {
      expect(PERMISSIONS.PING).toBeDefined();
      expect(PERMISSIONS.TRACEROUTE).toBeDefined();
      expect(PERMISSIONS.DNS).toBeDefined();
      expect(PERMISSIONS.WHOIS).toBeDefined();
      expect(PERMISSIONS.PORT_SCAN).toBeDefined();
      expect(PERMISSIONS.PORT_TEST).toBeDefined();
      expect(PERMISSIONS.IP_ADDRESS).toBeDefined();
      expect(PERMISSIONS.API_TEST).toBeDefined();
      expect(PERMISSIONS.TLS_TEST).toBeDefined();
      expect(PERMISSIONS.TCPDUMP).toBeDefined();
      expect(PERMISSIONS.IPERF).toBeDefined();
      expect(PERMISSIONS.LETSENCRYPT).toBeDefined();
    });
  });
});
