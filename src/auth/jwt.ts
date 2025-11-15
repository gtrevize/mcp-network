/**
 * JWT authentication with embedded user identity and roles
 */
import jwt from 'jsonwebtoken';
import { getConfig } from '../config/loader.js';

// Get JWT secret from config (which merges .env and config.json)
function getJWTSecret(): string {
  return getConfig().jwt.secret;
}

export interface AuthTokenPayload {
  userId: string;
  roles: string[];
  server: string;
  iat: number;
}

/**
 * Verify and decode JWT token
 * Returns the token payload with userId and roles, or null if invalid
 */
export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as any;

    // Validate required fields
    if (!decoded.userId || !Array.isArray(decoded.roles) || decoded.server !== 'mcp-network') {
      return null;
    }

    return {
      userId: decoded.userId,
      roles: decoded.roles,
      server: decoded.server,
      iat: decoded.iat
    };
  } catch (error) {
    return null;
  }
}

/**
 * Generate a JWT token with user identity and roles
 * Tokens never expire for simplicity
 */
export function generateAuthToken(userId: string, roles: string[]): string {
  const payload = {
    userId,
    roles,
    server: 'mcp-network',
    iat: Math.floor(Date.now() / 1000)
  };

  // No expiration for auth tokens
  return jwt.sign(payload, getJWTSecret());
}

/**
 * Generate a test token (for backward compatibility)
 */
export function generateTestToken(userId: string, roles: string[]): string {
  return generateAuthToken(userId, roles);
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
  IP_GEOLOCATION: 'network:ip_geolocation',
  REVERSE_DNS: 'network:reverse_dns',
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
    PERMISSIONS.IP_GEOLOCATION,
    PERMISSIONS.REVERSE_DNS,
  ],
  [ROLES.DEVELOPER]: [
    PERMISSIONS.PING,
    PERMISSIONS.PORT_TEST,
    PERMISSIONS.DNS,
    PERMISSIONS.API_TEST,
    PERMISSIONS.TLS_TEST,
    PERMISSIONS.IP_ADDRESS,
    PERMISSIONS.IP_GEOLOCATION,
    PERMISSIONS.REVERSE_DNS,
  ],
  [ROLES.AUDITOR]: [
    PERMISSIONS.PING,
    PERMISSIONS.TRACEROUTE,
    PERMISSIONS.PORT_TEST,
    PERMISSIONS.WHOIS,
    PERMISSIONS.DNS,
    PERMISSIONS.TLS_TEST,
    PERMISSIONS.IP_ADDRESS,
    PERMISSIONS.IP_GEOLOCATION,
    PERMISSIONS.REVERSE_DNS,
  ],
  [ROLES.READONLY]: [
    PERMISSIONS.PING,
    PERMISSIONS.DNS,
    PERMISSIONS.IP_ADDRESS,
    PERMISSIONS.IP_GEOLOCATION,
    PERMISSIONS.REVERSE_DNS,
  ],
};

