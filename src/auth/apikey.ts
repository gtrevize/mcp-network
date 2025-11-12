/**
 * API Key authentication for per-user access control
 */
import crypto from 'crypto';
import { getConfig } from '../config/loader.js';
import { logger } from '../logger/index.js';

export interface ApiKeyInfo {
  key: string;
  userId: string;
  roles: string[];
  enabled: boolean;
  description: string;
  createdAt: string;
}

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate and retrieve API key information
 */
export function validateApiKey(apiKey: string): ApiKeyInfo | null {
  const config = getConfig();
  const apiKeys = config.apiKeys || {};

  // Find the API key
  for (const [keyId, keyInfo] of Object.entries(apiKeys)) {
    if (keyInfo.key === apiKey) {
      // Check if enabled
      if (!keyInfo.enabled) {
        if (process.env.LOG_LEVEL !== 'silent') {
          logger.warn({ keyId, userId: keyInfo.userId }, 'Attempted use of disabled API key');
        }
        return null;
      }

      return keyInfo;
    }
  }

  if (process.env.LOG_LEVEL !== 'silent') {
    logger.warn({ apiKey: apiKey.substring(0, 8) + '...' }, 'Invalid API key used');
  }
  return null;
}

/**
 * Get API key by key ID
 */
export function getApiKeyById(keyId: string): ApiKeyInfo | null {
  const config = getConfig();
  const apiKeys = config.apiKeys || {};
  return apiKeys[keyId] || null;
}

/**
 * Check if user has permission based on API key
 */
export function hasApiKeyPermission(apiKeyInfo: ApiKeyInfo, requiredPermission: string, rolePermissions: Record<string, string[]>): boolean {
  // Admin role has all permissions
  if (apiKeyInfo.roles.includes('admin')) {
    return true;
  }

  // Get permissions for roles
  const permissions = apiKeyInfo.roles.flatMap(role => rolePermissions[role] || []);

  return permissions.includes(requiredPermission);
}

/**
 * List all API keys (without exposing the actual key values)
 */
export function listApiKeys(): Array<{ keyId: string; userId: string; roles: string[]; enabled: boolean; description: string }> {
  const config = getConfig();
  const apiKeys = config.apiKeys || {};

  return Object.entries(apiKeys).map(([keyId, keyInfo]) => ({
    keyId,
    userId: keyInfo.userId,
    roles: keyInfo.roles,
    enabled: keyInfo.enabled,
    description: keyInfo.description
  }));
}
