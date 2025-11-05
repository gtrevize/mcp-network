/**
 * JWT authentication and RBAC implementation
 */
import jwt from 'jsonwebtoken';
import { AuthToken } from '../types/index.js';
import { logger } from '../logger/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET_IN_PRODUCTION';

if (JWT_SECRET === 'CHANGE_THIS_SECRET_IN_PRODUCTION') {
  logger.warn('⚠️  Using default JWT secret - SET JWT_SECRET environment variable!');
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): AuthToken {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthToken;

    // Validate required fields
    if (!decoded.sub || !decoded.roles || !decoded.permissions) {
      throw new Error('Invalid token structure: missing required fields');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(token: AuthToken, requiredPermission: string): boolean {
  // Admin role has all permissions
  if (token.roles.includes('admin')) {
    return true;
  }

  return token.permissions.includes(requiredPermission);
}

/**
 * Check if user has required role
 */
export function hasRole(token: AuthToken, requiredRole: string): boolean {
  return token.roles.includes(requiredRole);
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(token: AuthToken, requiredRoles: string[]): boolean {
  return requiredRoles.some((role) => token.roles.includes(role));
}

/**
 * Permission definitions for RBAC
 */
export const PERMISSIONS = {
  PING: 'network:ping',
  TRACEROUTE: 'network:traceroute',
  PORT_TEST: 'network:port_test',
  WHOIS: 'network:whois',
  DNS: 'network:dns',
  API_TEST: 'network:api_test',
  PORT_SCAN: 'network:port_scan',
  TLS_TEST: 'network:tls_test',
  LETSENCRYPT: 'network:letsencrypt',
  TCPDUMP: 'network:tcpdump',
  IPERF: 'network:iperf',
  IP_ADDRESS: 'network:ip_address',
  VPN_TEST: 'network:vpn_test',
} as const;

/**
 * Role definitions
 */
export const ROLES = {
  ADMIN: 'admin',
  NETWORK_ENGINEER: 'network_engineer',
  DEVELOPER: 'developer',
  AUDITOR: 'auditor',
  READONLY: 'readonly',
} as const;

/**
 * Default role permissions mapping
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.NETWORK_ENGINEER]: [
    PERMISSIONS.PING,
    PERMISSIONS.TRACEROUTE,
    PERMISSIONS.PORT_TEST,
    PERMISSIONS.WHOIS,
    PERMISSIONS.DNS,
    PERMISSIONS.PORT_SCAN,
    PERMISSIONS.TLS_TEST,
    PERMISSIONS.LETSENCRYPT,
    PERMISSIONS.TCPDUMP,
    PERMISSIONS.IPERF,
    PERMISSIONS.IP_ADDRESS,
  ],
  [ROLES.DEVELOPER]: [
    PERMISSIONS.PING,
    PERMISSIONS.PORT_TEST,
    PERMISSIONS.DNS,
    PERMISSIONS.API_TEST,
    PERMISSIONS.TLS_TEST,
    PERMISSIONS.IP_ADDRESS,
  ],
  [ROLES.AUDITOR]: [
    PERMISSIONS.PING,
    PERMISSIONS.TRACEROUTE,
    PERMISSIONS.PORT_TEST,
    PERMISSIONS.WHOIS,
    PERMISSIONS.DNS,
    PERMISSIONS.TLS_TEST,
    PERMISSIONS.IP_ADDRESS,
  ],
  [ROLES.READONLY]: [
    PERMISSIONS.PING,
    PERMISSIONS.DNS,
    PERMISSIONS.IP_ADDRESS,
  ],
};

/**
 * Generate a token for testing (development only)
 */
export function generateTestToken(
  userId: string,
  roles: string[] = [ROLES.ADMIN],
  expiresIn: string = '24h'
): string {
  const permissions = roles.flatMap((role) => ROLE_PERMISSIONS[role] || []);

  const payload = {
    sub: userId,
    roles,
    permissions: [...new Set(permissions)], // Remove duplicates
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
}
