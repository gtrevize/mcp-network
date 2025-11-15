/**
 * Tests for JWT authentication and RBAC
 */
import {
  verifyAuthToken,
  generateAuthToken,
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
} from '../auth/jwt.js';

describe('Authentication and Authorization', () => {
  describe('Authentication Tokens', () => {
    test('should generate a valid auth token', () => {
      const token = generateAuthToken('test-user', ['admin']);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('should verify valid auth tokens', () => {
      const token = generateAuthToken('test-user', ['admin']);
      const payload = verifyAuthToken(token);
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe('test-user');
      expect(payload?.roles).toEqual(['admin']);
      expect(payload?.server).toBe('mcp-network');
    });

    test('should reject invalid auth tokens', () => {
      const payload = verifyAuthToken('invalid-token');
      expect(payload).toBeNull();
    });

    test('should reject tokens with wrong server identifier', () => {
      // Create a token with wrong server
      const jwt = require('jsonwebtoken');
      const wrongToken = jwt.sign(
        { userId: 'test', roles: ['admin'], server: 'wrong-server' },
        process.env.JWT_SECRET || 'test-secret'
      );
      const payload = verifyAuthToken(wrongToken);
      expect(payload).toBeNull();
    });

    test('should reject tokens without userId', () => {
      const jwt = require('jsonwebtoken');
      const wrongToken = jwt.sign(
        { roles: ['admin'], server: 'mcp-network' },
        process.env.JWT_SECRET || 'test-secret'
      );
      const payload = verifyAuthToken(wrongToken);
      expect(payload).toBeNull();
    });

    test('should reject tokens without roles', () => {
      const jwt = require('jsonwebtoken');
      const wrongToken = jwt.sign(
        { userId: 'test', server: 'mcp-network' },
        process.env.JWT_SECRET || 'test-secret'
      );
      const payload = verifyAuthToken(wrongToken);
      expect(payload).toBeNull();
    });

    test('should generate tokens with multiple roles', () => {
      const token = generateAuthToken('test-user', ['admin', 'developer']);
      const payload = verifyAuthToken(token);
      expect(payload?.roles).toEqual(['admin', 'developer']);
    });
  });

  describe('Role-Based Access Control', () => {
    test('should define all required roles', () => {
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.NETWORK_ENGINEER).toBe('network_engineer');
      expect(ROLES.DEVELOPER).toBe('developer');
      expect(ROLES.AUDITOR).toBe('auditor');
      expect(ROLES.READONLY).toBe('readonly');
    });

    test('should define all required permissions', () => {
      expect(PERMISSIONS.PING).toBe('network:ping');
      expect(PERMISSIONS.TRACEROUTE).toBe('network:traceroute');
      expect(PERMISSIONS.PORT_TEST).toBe('network:port_test');
      expect(PERMISSIONS.WHOIS).toBe('network:whois');
      expect(PERMISSIONS.DNS).toBe('network:dns');
      expect(PERMISSIONS.API_TEST).toBe('network:api_test');
      expect(PERMISSIONS.PORT_SCAN).toBe('network:port_scan');
      expect(PERMISSIONS.TLS_TEST).toBe('network:tls_test');
      expect(PERMISSIONS.LETSENCRYPT).toBe('network:letsencrypt');
      expect(PERMISSIONS.TCPDUMP).toBe('network:tcpdump');
      expect(PERMISSIONS.IPERF).toBe('network:iperf');
      expect(PERMISSIONS.IP_ADDRESS).toBe('network:ip_address');
      expect(PERMISSIONS.IP_GEOLOCATION).toBe('network:ip_geolocation');
      expect(PERMISSIONS.REVERSE_DNS).toBe('network:reverse_dns');
    });

    test('admin role should have all permissions', () => {
      const adminPermissions = ROLE_PERMISSIONS[ROLES.ADMIN];
      expect(adminPermissions).toContain(PERMISSIONS.PING);
      expect(adminPermissions).toContain(PERMISSIONS.TRACEROUTE);
      expect(adminPermissions).toContain(PERMISSIONS.PORT_SCAN);
      expect(adminPermissions).toContain(PERMISSIONS.TCPDUMP);
      expect(adminPermissions).toContain(PERMISSIONS.IPERF);
      expect(adminPermissions.length).toBeGreaterThan(10);
    });

    test('readonly role should have minimal permissions', () => {
      const readonlyPermissions = ROLE_PERMISSIONS[ROLES.READONLY];
      expect(readonlyPermissions).toContain(PERMISSIONS.PING);
      expect(readonlyPermissions).toContain(PERMISSIONS.DNS);
      expect(readonlyPermissions).toContain(PERMISSIONS.IP_ADDRESS);
      expect(readonlyPermissions).not.toContain(PERMISSIONS.PORT_SCAN);
      expect(readonlyPermissions).not.toContain(PERMISSIONS.TCPDUMP);
    });

    test('network_engineer role should have network diagnostic permissions', () => {
      const nePermissions = ROLE_PERMISSIONS[ROLES.NETWORK_ENGINEER];
      expect(nePermissions).toContain(PERMISSIONS.PING);
      expect(nePermissions).toContain(PERMISSIONS.TRACEROUTE);
      expect(nePermissions).toContain(PERMISSIONS.PORT_SCAN);
      expect(nePermissions).toContain(PERMISSIONS.WHOIS);
      expect(nePermissions).toContain(PERMISSIONS.DNS);
    });

    test('developer role should have API testing permissions', () => {
      const devPermissions = ROLE_PERMISSIONS[ROLES.DEVELOPER];
      expect(devPermissions).toContain(PERMISSIONS.PING);
      expect(devPermissions).toContain(PERMISSIONS.API_TEST);
      expect(devPermissions).toContain(PERMISSIONS.TLS_TEST);
      expect(devPermissions).toContain(PERMISSIONS.DNS);
    });

    test('auditor role should have read-only network permissions', () => {
      const auditorPermissions = ROLE_PERMISSIONS[ROLES.AUDITOR];
      expect(auditorPermissions).toContain(PERMISSIONS.PING);
      expect(auditorPermissions).toContain(PERMISSIONS.TRACEROUTE);
      expect(auditorPermissions).toContain(PERMISSIONS.WHOIS);
      expect(auditorPermissions).toContain(PERMISSIONS.DNS);
      expect(auditorPermissions).not.toContain(PERMISSIONS.LETSENCRYPT);
    });
  });

  describe('Token Generation with Different Roles', () => {
    test('should generate token for admin user', () => {
      const token = generateAuthToken('admin-user', [ROLES.ADMIN]);
      const payload = verifyAuthToken(token);
      expect(payload?.userId).toBe('admin-user');
      expect(payload?.roles).toContain(ROLES.ADMIN);
    });

    test('should generate token for readonly user', () => {
      const token = generateAuthToken('monitor-bot', [ROLES.READONLY]);
      const payload = verifyAuthToken(token);
      expect(payload?.userId).toBe('monitor-bot');
      expect(payload?.roles).toContain(ROLES.READONLY);
    });

    test('should generate token for developer', () => {
      const token = generateAuthToken('dev-user', [ROLES.DEVELOPER]);
      const payload = verifyAuthToken(token);
      expect(payload?.userId).toBe('dev-user');
      expect(payload?.roles).toContain(ROLES.DEVELOPER);
    });
  });
});
