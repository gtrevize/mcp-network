/**
 * Tests for JWT authentication and RBAC
 */
import {
  verifyToken,
  hasPermission,
  hasRole,
  generateTestToken,
  PERMISSIONS,
  ROLES,
} from '../auth/jwt.js';

describe('Authentication and Authorization', () => {
  describe('generateTestToken', () => {
    test('should generate a valid JWT token', () => {
      const token = generateTestToken('test-user', [ROLES.ADMIN]);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should include required fields', () => {
      const token = generateTestToken('test-user', [ROLES.ADMIN]);
      const decoded = verifyToken(token);

      expect(decoded.sub).toBe('test-user');
      expect(decoded.roles).toContain(ROLES.ADMIN);
      expect(decoded.permissions).toBeDefined();
      expect(Array.isArray(decoded.permissions)).toBe(true);
    });
  });

  describe('verifyToken', () => {
    test('should verify valid tokens', () => {
      const token = generateTestToken('test-user', [ROLES.ADMIN]);
      const decoded = verifyToken(token);

      expect(decoded.sub).toBe('test-user');
    });

    test('should reject invalid tokens', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    test('should reject expired tokens', () => {
      const expiredToken = generateTestToken('test-user', [ROLES.ADMIN], '1ms');

      // Wait for token to expire
      return new Promise((resolve) => setTimeout(resolve, 100)).then(() => {
        expect(() => verifyToken(expiredToken)).toThrow('Token has expired');
      });
    });
  });

  describe('hasPermission', () => {
    test('admin should have all permissions', () => {
      const token = generateTestToken('admin', [ROLES.ADMIN]);
      const decoded = verifyToken(token);

      expect(hasPermission(decoded, PERMISSIONS.PING)).toBe(true);
      expect(hasPermission(decoded, PERMISSIONS.PORT_SCAN)).toBe(true);
      expect(hasPermission(decoded, PERMISSIONS.TCPDUMP)).toBe(true);
    });

    test('developer should have limited permissions', () => {
      const token = generateTestToken('dev', [ROLES.DEVELOPER]);
      const decoded = verifyToken(token);

      expect(hasPermission(decoded, PERMISSIONS.PING)).toBe(true);
      expect(hasPermission(decoded, PERMISSIONS.API_TEST)).toBe(true);
      expect(hasPermission(decoded, PERMISSIONS.PORT_SCAN)).toBe(false);
      expect(hasPermission(decoded, PERMISSIONS.TCPDUMP)).toBe(false);
    });

    test('readonly should have minimal permissions', () => {
      const token = generateTestToken('readonly', [ROLES.READONLY]);
      const decoded = verifyToken(token);

      expect(hasPermission(decoded, PERMISSIONS.PING)).toBe(true);
      expect(hasPermission(decoded, PERMISSIONS.DNS)).toBe(true);
      expect(hasPermission(decoded, PERMISSIONS.PORT_SCAN)).toBe(false);
    });
  });

  describe('hasRole', () => {
    test('should correctly identify roles', () => {
      const token = generateTestToken('user', [ROLES.NETWORK_ENGINEER]);
      const decoded = verifyToken(token);

      expect(hasRole(decoded, ROLES.NETWORK_ENGINEER)).toBe(true);
      expect(hasRole(decoded, ROLES.ADMIN)).toBe(false);
    });

    test('should support multiple roles', () => {
      const token = generateTestToken('user', [ROLES.DEVELOPER, ROLES.AUDITOR]);
      const decoded = verifyToken(token);

      expect(hasRole(decoded, ROLES.DEVELOPER)).toBe(true);
      expect(hasRole(decoded, ROLES.AUDITOR)).toBe(true);
      expect(hasRole(decoded, ROLES.ADMIN)).toBe(false);
    });
  });
});
