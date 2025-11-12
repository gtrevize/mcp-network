import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../logger/index.js';

// Handle __dirname in both ESM runtime and test environments
let PROJECT_ROOT: string;
try {
  // Use eval to prevent TypeScript from checking import.meta at compile time
  const metaUrl = (new Function('return typeof import.meta !== "undefined" ? import.meta.url : null'))();
  if (metaUrl) {
    const __filename = fileURLToPath(metaUrl);
    const __dirname = path.dirname(__filename);
    PROJECT_ROOT = path.resolve(__dirname, '../../');
  } else {
    PROJECT_ROOT = process.cwd();
  }
} catch {
  // Fallback for test environment or if import.meta is not available
  PROJECT_ROOT = process.cwd();
}

export interface ApiKeyConfig {
  key: string;
  userId: string;
  roles: string[];
  enabled: boolean;
  description: string;
  createdAt: string;
}

export interface ToolConfig {
  enabled: boolean;
  maxTimeout?: number;
  maxCount?: number;
  maxHops?: number;
  maxRange?: number;
  requiresSudo?: boolean;
}

export interface ServerConfig {
  jwt: {
    secret: string;
    serverToken: string; // The single permanent JWT token
  };
  server: {
    name: string;
    version: string;
    description: string;
  };
  security: {
    jailbreakDetection: boolean;
    inputValidation: boolean;
    allowedIPs: string[];
  };
  rateLimit: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
  tools: Record<string, ToolConfig>;
  apiKeys: Record<string, ApiKeyConfig>;
  letsencrypt: {
    production: boolean;
    email: string;
  };
  logging: {
    level: string;
    accessLogFile?: string;
  };
}

class ConfigurationLoader {
  private config: ServerConfig | null = null;

  constructor() {
    this.loadEnvironment();
  }

  private loadEnvironment(): void {
    // Load .env file
    const envPath = path.join(PROJECT_ROOT, '.env');

    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      if (process.env.LOG_LEVEL !== 'silent') {
        logger.info('Loaded configuration from .env file');
      }
    } else {
      if (process.env.LOG_LEVEL !== 'silent') {
        logger.warn('No .env file found, using environment variables and defaults');
      }
    }
  }

  private loadConfigFile(): any {
    const configPath = path.join(PROJECT_ROOT, 'config.json');

    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        if (process.env.LOG_LEVEL !== 'silent') {
          logger.info('Loaded configuration from config.json');
        }
        return config;
      } catch (error) {
        if (process.env.LOG_LEVEL !== 'silent') {
          logger.error({ error }, 'Failed to parse config.json');
        }
        throw new Error('Invalid config.json file');
      }
    }

    return {};
  }

  private getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  private getEnvNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  }

  private getEnvString(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  private getEnvArray(key: string, defaultValue: string[] = []): string[] {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  public load(): ServerConfig {
    if (this.config) {
      return this.config;
    }

    // Load config.json
    const fileConfig = this.loadConfigFile();

    // Build configuration from .env with config.json overrides
    this.config = {
      jwt: {
        secret: fileConfig.jwt?.secret || this.getEnvString('JWT_SECRET', 'CHANGEME'),
        serverToken: fileConfig.jwt?.serverToken || this.getEnvString('JWT_SERVER_TOKEN', 'CHANGEME'),
      },
      server: {
        name: fileConfig.server?.name || 'mcp-network',
        version: fileConfig.server?.version || '1.0.0',
        description: fileConfig.server?.description || 'MCP Network Testing Server',
      },
      security: {
        jailbreakDetection: fileConfig.security?.jailbreakDetection ?? this.getEnvBoolean('SECURITY_JAILBREAK_DETECTION', true),
        inputValidation: fileConfig.security?.inputValidation ?? this.getEnvBoolean('SECURITY_INPUT_VALIDATION', true),
        allowedIPs: fileConfig.security?.allowedIPs || this.getEnvArray('ALLOWED_IPS', []),
      },
      rateLimit: {
        enabled: fileConfig.rateLimit?.enabled ?? this.getEnvBoolean('RATE_LIMIT_ENABLED', true),
        maxRequests: fileConfig.rateLimit?.maxRequests ?? this.getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
        windowMs: fileConfig.rateLimit?.windowMs ?? this.getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
      },
      tools: this.loadToolsConfig(fileConfig.tools || {}),
      apiKeys: fileConfig.apiKeys || {},
      letsencrypt: {
        production: this.getEnvBoolean('LETSENCRYPT_PRODUCTION', false),
        email: this.getEnvString('LETSENCRYPT_EMAIL', 'CHANGEME'),
      },
      logging: {
        level: this.getEnvString('LOG_LEVEL', 'info'),
        accessLogFile: process.env.ACCESS_LOG_FILE,
      },
    };

    return this.config;
  }

  private loadToolsConfig(fileTools: any): Record<string, ToolConfig> {
    const tools: Record<string, ToolConfig> = {};

    const toolNames = [
      'ping', 'traceroute', 'nslookup', 'whois', 'dig',
      'host', 'curl', 'ssl_check', 'port_scan', 'nmap',
      'tcpdump', 'iperf'
    ];

    for (const toolName of toolNames) {
      const envKey = `TOOL_${toolName.toUpperCase()}_ENABLED`;
      tools[toolName] = {
        enabled: fileTools[toolName]?.enabled ?? this.getEnvBoolean(envKey, true),
        ...(fileTools[toolName] || {}),
      };
    }

    return tools;
  }

  public validateConfiguration(): { valid: boolean; errors: string[] } {
    if (!this.config) {
      this.load();
    }

    const errors: string[] = [];

    // Check for CHANGEME canary values
    if (this.config!.jwt.secret === 'CHANGEME') {
      errors.push('JWT_SECRET must be changed from default CHANGEME value');
    }

    if (this.config!.jwt.serverToken === 'CHANGEME') {
      errors.push('JWT_SERVER_TOKEN must be changed from default CHANGEME value - run: npm run config generate-server-token');
    }

    if (this.config!.letsencrypt.email === 'CHANGEME') {
      errors.push('LETSENCRYPT_EMAIL must be changed from default CHANGEME value (or disable Let\'s Encrypt tools)');
    }

    // Validate JWT secret length
    if (this.config!.jwt.secret.length < 32 && this.config!.jwt.secret !== 'CHANGEME') {
      errors.push('JWT_SECRET should be at least 32 characters long for security');
    }

    // Check that at least one API key exists
    if (Object.keys(this.config!.apiKeys).length === 0) {
      errors.push('At least one API key must be configured - run: npm run config add-key');
    }

    // Validate rate limit values
    if (this.config!.rateLimit.enabled) {
      if (this.config!.rateLimit.maxRequests <= 0) {
        errors.push('RATE_LIMIT_MAX_REQUESTS must be greater than 0');
      }
      if (this.config!.rateLimit.windowMs <= 0) {
        errors.push('RATE_LIMIT_WINDOW_MS must be greater than 0');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public get(): ServerConfig {
    if (!this.config) {
      this.load();
    }
    return this.config!;
  }

  public reload(): ServerConfig {
    this.config = null;
    return this.load();
  }

  public getApiKeyConfig(keyId: string): ApiKeyConfig | undefined {
    return this.get().apiKeys[keyId];
  }

  public getAllApiKeys(): Record<string, ApiKeyConfig> {
    return this.get().apiKeys;
  }

  public isApiKeyEnabled(keyId: string): boolean {
    const apiKey = this.getApiKeyConfig(keyId);
    if (!apiKey) return false;

    return apiKey.enabled;
  }
}

// Lazy singleton instance - only created when first accessed
let configLoader: ConfigurationLoader | null = null;

function getConfigLoader(): ConfigurationLoader {
  if (!configLoader) {
    configLoader = new ConfigurationLoader();
  }
  return configLoader;
}

export const getConfig = () => getConfigLoader().get();
export const validateConfig = () => getConfigLoader().validateConfiguration();
export const reloadConfig = () => getConfigLoader().reload();
