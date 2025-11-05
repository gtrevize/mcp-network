#!/usr/bin/env node

/**
 * MCP Network Testing Server
 * A comprehensive network testing server compliant with Anthropic's MCP protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { logger, AccessLogger } from './logger/index.js';
import { verifyToken, hasPermission, PERMISSIONS } from './auth/jwt.js';
import { generateRequestId } from './utils/helpers.js';
import { ToolExecutionContext } from './types/index.js';

// Import all tools
import { ping } from './tools/ping.js';
import { traceroute } from './tools/traceroute.js';
import { testPort } from './tools/port-test.js';
import { whois } from './tools/whois.js';
import { dnsLookup } from './tools/dns.js';
import { testApi } from './tools/api-test.js';
import { portScan } from './tools/nmap.js';
import { testTls } from './tools/tls-test.js';
import { manageLetsEncrypt } from './tools/letsencrypt.js';
import { captureTcpdump } from './tools/tcpdump.js';
import { runIperf } from './tools/iperf.js';
import { getIpAddress } from './tools/ip-address.js';

const SERVER_NAME = 'mcp-network';
const SERVER_VERSION = '1.0.0';

/**
 * Tool definitions for MCP
 */
const TOOLS: Tool[] = [
  {
    name: 'ping',
    description: 'Ping a host to test connectivity and measure round-trip time. Supports both IPv4 and IPv6.',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'The hostname or IP address to ping',
        },
        count: {
          type: 'number',
          description: 'Number of ping packets to send (default: 4, max: 20)',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 5000, max: 30000)',
        },
        ipv6: {
          type: 'boolean',
          description: 'Use IPv6 instead of IPv4',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'traceroute',
    description: 'Trace the network route to a destination host',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'The hostname or IP address to trace',
        },
        maxHops: {
          type: 'number',
          description: 'Maximum number of hops (default: 30, max: 64)',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000, max: 60000)',
        },
        ipv6: {
          type: 'boolean',
          description: 'Use IPv6 instead of IPv4',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'test_port',
    description: 'Test if a specific port is open on a target host',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'The hostname or IP address to test',
        },
        port: {
          type: 'number',
          description: 'The port number to test (1-65535)',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 5000, max: 30000)',
        },
        protocol: {
          type: 'string',
          enum: ['tcp', 'udp'],
          description: 'Protocol to use (default: tcp)',
        },
      },
      required: ['target', 'port'],
    },
  },
  {
    name: 'whois',
    description: 'Perform WHOIS lookup for a domain or IP address',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'The domain name or IP address to lookup',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 10000, max: 30000)',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'dns_lookup',
    description: 'Perform DNS lookup for a hostname',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'The hostname to resolve',
        },
        recordType: {
          type: 'string',
          enum: ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'PTR'],
          description: 'DNS record type (default: A)',
        },
        nameserver: {
          type: 'string',
          description: 'Use a specific nameserver',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 5000, max: 30000)',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'test_api',
    description: 'Test an HTTP/HTTPS API endpoint (Postman-style testing)',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The API endpoint URL',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
          description: 'HTTP method',
        },
        headers: {
          type: 'object',
          description: 'HTTP headers',
        },
        body: {
          description: 'Request body (for POST/PUT/PATCH)',
        },
        expectedStatus: {
          type: 'number',
          description: 'Expected HTTP status code',
        },
        expectedBody: {
          description: 'Expected response body',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000, max: 120000)',
        },
        validateTLS: {
          type: 'boolean',
          description: 'Validate TLS certificates',
        },
      },
      required: ['url', 'method'],
    },
  },
  {
    name: 'port_scan',
    description: 'Scan ports on a single IP address (uses nmap with throttling)',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Single IP address to scan (hostnames not allowed)',
        },
        ports: {
          type: 'string',
          description: 'Port range (e.g., "1-1000" or "80,443,8080") (default: 1-1000)',
        },
        scanType: {
          type: 'string',
          enum: ['tcp', 'syn', 'udp'],
          description: 'Scan type (default: tcp)',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 60000, max: 300000)',
        },
        throttleMs: {
          type: 'number',
          description: 'Milliseconds between port scans (default: 100, min: 50)',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'test_tls',
    description: 'Test TLS/SSL certificate validity for a server',
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Hostname or IP address',
        },
        port: {
          type: 'number',
          description: 'Port number (default: 443)',
        },
        servername: {
          type: 'string',
          description: 'SNI server name (defaults to target)',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 10000, max: 30000)',
        },
      },
      required: ['target'],
    },
  },
  {
    name: 'letsencrypt',
    description: 'Manage Let\'s Encrypt SSL/TLS certificates (DNS or HTTP challenge)',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Fully qualified domain name',
        },
        email: {
          type: 'string',
          description: 'Email address for Let\'s Encrypt account',
        },
        challenge: {
          type: 'string',
          enum: ['dns', 'http'],
          description: 'Challenge type (default: dns)',
        },
        cloudProvider: {
          type: 'string',
          enum: ['aws', 'azure'],
          description: 'Cloud provider for DNS automation',
        },
        cloudCredentials: {
          type: 'object',
          description: 'Cloud provider credentials (not stored)',
        },
        action: {
          type: 'string',
          enum: ['create', 'renew', 'revoke'],
          description: 'Certificate action',
        },
      },
      required: ['domain', 'email', 'action'],
    },
  },
  {
    name: 'tcpdump',
    description: 'Capture network packets with tcpdump (returns compressed pcap)',
    inputSchema: {
      type: 'object',
      properties: {
        interface: {
          type: 'string',
          description: 'Network interface to capture on',
        },
        filter: {
          type: 'string',
          description: 'BPF filter expression',
        },
        duration: {
          type: 'number',
          description: 'Capture duration in seconds (default: 10, max: 300)',
        },
        maxSize: {
          type: 'number',
          description: 'Maximum capture size in MB (default: 10, max: 100)',
        },
        output: {
          type: 'string',
          enum: ['base64', 'url'],
          description: 'Output format (default: base64)',
        },
      },
    },
  },
  {
    name: 'iperf',
    description: 'Run iPerf3 network bandwidth test as client or server',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['client', 'server', 'both'],
          description: 'Operation mode',
        },
        serverHost: {
          type: 'string',
          description: 'Server hostname (required for client mode)',
        },
        port: {
          type: 'number',
          description: 'Port number (default: 5201)',
        },
        duration: {
          type: 'number',
          description: 'Test duration in seconds (default: 10, max: 300)',
        },
        protocol: {
          type: 'string',
          enum: ['tcp', 'udp'],
          description: 'Protocol (default: tcp)',
        },
        bandwidth: {
          type: 'string',
          description: 'Target bandwidth for UDP (e.g., "100M")',
        },
        parallel: {
          type: 'number',
          description: 'Number of parallel streams',
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'get_ip_address',
    description: 'Get the public IP address of this server (both IPv4 and IPv6)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * Map tool names to their permission requirements
 */
const TOOL_PERMISSIONS: Record<string, string> = {
  ping: PERMISSIONS.PING,
  traceroute: PERMISSIONS.TRACEROUTE,
  test_port: PERMISSIONS.PORT_TEST,
  whois: PERMISSIONS.WHOIS,
  dns_lookup: PERMISSIONS.DNS,
  test_api: PERMISSIONS.API_TEST,
  port_scan: PERMISSIONS.PORT_SCAN,
  test_tls: PERMISSIONS.TLS_TEST,
  letsencrypt: PERMISSIONS.LETSENCRYPT,
  tcpdump: PERMISSIONS.TCPDUMP,
  iperf: PERMISSIONS.IPERF,
  get_ip_address: PERMISSIONS.IP_ADDRESS,
};

/**
 * Extract and verify JWT token from request
 */
function extractAuthContext(_request: any): ToolExecutionContext {
  const token = process.env.MCP_AUTH_TOKEN;

  if (!token) {
    throw new Error('Authentication required: MCP_AUTH_TOKEN not provided');
  }

  const authToken = verifyToken(token);

  return {
    userId: authToken.sub,
    roles: authToken.roles,
    permissions: authToken.permissions,
    timestamp: Date.now(),
    requestId: generateRequestId(),
  };
}

/**
 * Execute a tool with proper error handling and logging
 */
async function executeTool(
  toolName: string,
  args: any,
  context: ToolExecutionContext
): Promise<any> {
  const startTime = Date.now();

  try {
    // Check permission
    const requiredPermission = TOOL_PERMISSIONS[toolName];
    if (!requiredPermission) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const authToken = verifyToken(process.env.MCP_AUTH_TOKEN!);
    if (!hasPermission(authToken, requiredPermission)) {
      throw new Error(`Permission denied: ${requiredPermission} required`);
    }

    // Execute the tool
    let result;
    switch (toolName) {
      case 'ping':
        result = await ping(args);
        break;
      case 'traceroute':
        result = await traceroute(args);
        break;
      case 'test_port':
        result = await testPort(args);
        break;
      case 'whois':
        result = await whois(args);
        break;
      case 'dns_lookup':
        result = await dnsLookup(args);
        break;
      case 'test_api':
        result = await testApi(args);
        break;
      case 'port_scan':
        result = await portScan(args);
        break;
      case 'test_tls':
        result = await testTls(args);
        break;
      case 'letsencrypt':
        result = await manageLetsEncrypt(args);
        break;
      case 'tcpdump':
        result = await captureTcpdump(args);
        break;
      case 'iperf':
        result = await runIperf(args);
        break;
      case 'get_ip_address':
        result = await getIpAddress();
        break;
      default:
        throw new Error(`Tool not implemented: ${toolName}`);
    }

    // Log access
    AccessLogger.log({
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      userId: context.userId,
      tool: toolName,
      action: 'execute',
      parameters: args,
      success: result.success,
      duration: Date.now() - startTime,
      error: result.success ? undefined : result.error,
    });

    return result;
  } catch (error: any) {
    // Log failed access
    AccessLogger.log({
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      userId: context.userId,
      tool: toolName,
      action: 'execute',
      parameters: args,
      success: false,
      duration: Date.now() - startTime,
      error: error.message,
    });

    throw error;
  }
}

/**
 * Main server setup
 */
async function main() {
  logger.info(`Starting ${SERVER_NAME} v${SERVER_VERSION}`);

  // Create MCP server
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing tools');
    return { tools: TOOLS };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: toolName, arguments: args } = request.params;

    logger.info({ toolName, args }, 'Tool call received');

    try {
      // Extract auth context
      const context = extractAuthContext(request);

      // Execute tool
      const result = await executeTool(toolName, args || {}, context);

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: result.error,
                  timestamp: result.timestamp,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    } catch (error: any) {
      logger.error({ error: error.message, toolName, args }, 'Tool execution failed');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error.message,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('MCP Network Server started successfully');
  logger.info('Authentication: ' + (process.env.MCP_AUTH_TOKEN ? 'Enabled' : 'DISABLED - Set MCP_AUTH_TOKEN!'));
}

// Handle errors
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  process.exit(1);
});

// Start the server
main().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
