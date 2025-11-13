/**
 * JWT authentication for server-level access
 * API Key authentication for user-level access
 */
import jwt from 'jsonwebtoken';
import { getConfig } from '../config/loader.js';

// Get JWT secret from config (which merges .env and config.json)
function getJWTSecret(): string {
  return getConfig().jwt.secret;
}

/**
 * Verify JWT token (server-level authentication)
 * This token never expires and is shared across all clients
 */
export function verifyServerToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as any;

    // Check if it's the server token
    return decoded.type === 'server' && decoded.server === 'mcp-network';
  } catch (error) {
    return false;
  }
}

/**
 * Generate the permanent server JWT token
 * This should be done once and stored in config
 */
export function generateServerToken(): string {
  const payload = {
    type: 'server',
    server: 'mcp-network',
    version: '1.0.0',
    iat: Math.floor(Date.now() / 1000)
  };

  // No expiration for server token
  return jwt.sign(payload, getJWTSecret());
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

