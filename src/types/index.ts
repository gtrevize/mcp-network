/**
 * Type definitions for the MCP Network Server
 */

export interface AuthToken {
  sub: string;
  roles: string[];
  permissions: string[];
  exp: number;
  iat: number;
}

export interface ToolExecutionContext {
  userId: string;
  roles: string[];
  permissions: string[];
  timestamp: number;
  requestId: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  sanitized?: any;
}

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime: number;
  timestamp: string;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (context: ToolExecutionContext) => string;
}

export interface TimeoutConfig {
  default: number;
  max: number;
  min: number;
}

// Tool-specific interfaces
export interface PingOptions {
  target: string;
  count?: number;
  timeout?: number;
  ipv6?: boolean;
}

export interface TracerouteOptions {
  target: string;
  maxHops?: number;
  timeout?: number;
  ipv6?: boolean;
}

export interface PortTestOptions {
  target: string;
  port: number;
  timeout?: number;
  protocol?: 'tcp' | 'udp';
}

export interface WhoisOptions {
  target: string;
  timeout?: number;
}

export interface DnsOptions {
  target: string;
  recordType?: 'A' | 'AAAA' | 'MX' | 'TXT' | 'NS' | 'CNAME' | 'SOA' | 'PTR';
  nameserver?: string;
  timeout?: number;
}

export interface ApiTestOptions {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  expectedStatus?: number;
  expectedBody?: any;
  timeout?: number;
  validateTLS?: boolean;
}

export interface NmapOptions {
  target: string;
  ports?: string; // e.g., "1-1000" or "80,443,8080"
  scanType?: 'tcp' | 'syn' | 'udp';
  timeout?: number;
  throttleMs?: number;
}

export interface TlsTestOptions {
  target: string;
  port?: number;
  servername?: string;
  timeout?: number;
}

export interface LetsEncryptOptions {
  domain: string;
  email: string;
  challenge: 'dns' | 'http';
  cloudProvider?: 'aws' | 'azure';
  cloudCredentials?: Record<string, string>;
  action: 'create' | 'renew' | 'revoke';
}

export interface TcpdumpOptions {
  interface?: string;
  filter?: string;
  duration?: number;
  maxSize?: number; // in MB
  output?: 'base64' | 'url';
}

export interface IperfOptions {
  mode: 'client' | 'server' | 'both';
  serverHost?: string;
  port?: number;
  duration?: number;
  protocol?: 'tcp' | 'udp';
  bandwidth?: string; // e.g., "100M"
  parallel?: number;
}

export interface IpAddressResult {
  message: string;
  methods: {
    curl: string;
    browser: string;
    api: string;
  };
  recommendedServices: {
    ipv4: string[];
    ipv6: string[];
  };
  note: string;
}

export interface AccessLog {
  timestamp: string;
  requestId: string;
  userId: string;
  tool: string;
  action: string;
  parameters: any;
  success: boolean;
  duration: number;
  error?: string;
  sourceIp?: string;
}
