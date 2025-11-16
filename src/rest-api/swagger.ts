/**
 * OpenAPI/Swagger specification for REST API
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MCP Network Testing API',
      version: '1.0.0',
      description: 'REST API for network testing and diagnostics with 14 powerful tools',
      contact: {
        name: 'API Support',
        url: 'https://github.com/gtrevize/mcp-network',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'http://localhost:{port}',
        description: 'Custom port',
        variables: {
          port: {
            default: '3001',
            description: 'API server port (configurable via API_PORT env variable)',
          },
        },
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token. Generate with: npm run generate-token <userId> <role>',
        },
        AuthTokenHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'AUTH-TOKEN',
          description: 'Alternative: Provide JWT token via AUTH-TOKEN header',
        },
      },
      schemas: {
        ToolResult: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the tool execution was successful',
            },
            data: {
              type: 'object',
              description: 'Tool-specific result data',
            },
            executionTime: {
              type: 'number',
              description: 'Execution time in milliseconds',
            },
            timestamp: {
              type: 'number',
              description: 'Unix timestamp of execution',
            },
            error: {
              type: 'string',
              description: 'Error message (if success is false)',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Unauthorized',
            },
            message: {
              type: 'string',
              example: 'Authentication required',
            },
          },
        },
        PingRequest: {
          type: 'object',
          required: ['target'],
          properties: {
            target: {
              type: 'string',
              description: 'Hostname or IP address to ping',
              example: 'google.com',
            },
            count: {
              type: 'number',
              description: 'Number of ping packets (1-20)',
              example: 4,
            },
            timeout: {
              type: 'number',
              description: 'Timeout in milliseconds',
              example: 5000,
            },
            ipv6: {
              type: 'boolean',
              description: 'Use IPv6 instead of IPv4',
              example: false,
            },
          },
        },
        DnsLookupRequest: {
          type: 'object',
          required: ['target'],
          properties: {
            target: {
              type: 'string',
              description: 'Hostname to resolve',
              example: 'example.com',
            },
            recordType: {
              type: 'string',
              enum: ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'PTR', 'SRV'],
              description: 'DNS record type',
              example: 'A',
            },
            nameserver: {
              type: 'string',
              description: 'Specific nameserver to query',
              example: '8.8.8.8',
            },
            timeout: {
              type: 'number',
              description: 'Query timeout in milliseconds',
              example: 5000,
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
      {
        AuthTokenHeader: [],
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
      {
        name: 'Tools',
        description: 'Network testing tools',
      },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          description: 'Check if the API server is running',
          security: [],
          responses: {
            '200': {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      status: { type: 'string', example: 'healthy' },
                      timestamp: { type: 'string', format: 'date-time' },
                      uptime: { type: 'number', example: 1234.56 },
                      environment: { type: 'string', example: 'development' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/tools': {
        get: {
          tags: ['Tools'],
          summary: 'List all tools',
          description: 'Get a list of all available network testing tools and user permissions',
          responses: {
            '200': {
              description: 'List of available tools',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      tools: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            description: { type: 'string' },
                            permission: { type: 'string' },
                          },
                        },
                      },
                      userPermissions: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/tools/ping': {
        post: {
          tags: ['Tools'],
          summary: 'Ping a host',
          description: 'Test connectivity and measure round-trip time to a host',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PingRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Ping results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ToolResult' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '403': {
              description: 'Forbidden - Insufficient permissions',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/tools/dns_lookup': {
        post: {
          tags: ['Tools'],
          summary: 'DNS lookup',
          description: 'Query DNS records for a hostname',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DnsLookupRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'DNS lookup results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ToolResult' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/tools/traceroute': {
        post: {
          tags: ['Tools'],
          summary: 'Traceroute to a host',
          description: 'Trace the network path to a destination',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['target'],
                  properties: {
                    target: { type: 'string', example: 'google.com' },
                    maxHops: { type: 'number', example: 30 },
                    timeout: { type: 'number', example: 5000 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Traceroute results', content: { 'application/json': { schema: { $ref: '#/components/schemas/ToolResult' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/tools/test_port': {
        post: {
          tags: ['Tools'],
          summary: 'Test port connectivity',
          description: 'Check if a specific port is open on a target host',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['target', 'port'],
                  properties: {
                    target: { type: 'string', example: 'google.com' },
                    port: { type: 'number', example: 443 },
                    timeout: { type: 'number', example: 5000 },
                    protocol: { type: 'string', enum: ['tcp', 'udp'], example: 'tcp' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Port test results', content: { 'application/json': { schema: { $ref: '#/components/schemas/ToolResult' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/tools/whois': {
        post: {
          tags: ['Tools'],
          summary: 'WHOIS lookup',
          description: 'Get domain or IP WHOIS information',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['target'],
                  properties: {
                    target: { type: 'string', example: 'example.com' },
                    timeout: { type: 'number', example: 10000 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'WHOIS results', content: { 'application/json': { schema: { $ref: '#/components/schemas/ToolResult' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/tools/test_api': {
        post: {
          tags: ['Tools'],
          summary: 'Test API endpoint',
          description: 'Test HTTP/HTTPS API endpoints',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url'],
                  properties: {
                    url: { type: 'string', example: 'https://httpbin.org/get' },
                    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], example: 'GET' },
                    headers: { type: 'object', example: { 'User-Agent': 'MCP-Network' } },
                    body: { type: 'string', example: '{"test": "data"}' },
                    expectedStatus: { type: 'number', example: 200 },
                    timeout: { type: 'number', example: 10000 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'API test results', content: { 'application/json': { schema: { $ref: '#/components/schemas/ToolResult' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/tools/port_scan': {
        post: {
          tags: ['Tools'],
          summary: 'Port scan',
          description: 'Scan ports on a target host using nmap',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['target', 'ports'],
                  properties: {
                    target: { type: 'string', example: '192.168.1.1' },
                    ports: { type: 'string', example: '22,80,443' },
                    scanType: { type: 'string', enum: ['tcp', 'syn', 'udp'], example: 'tcp' },
                    throttleMs: { type: 'number', example: 100 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Port scan results', content: { 'application/json': { schema: { $ref: '#/components/schemas/ToolResult' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/tools/test_tls': {
        post: {
          tags: ['Tools'],
          summary: 'Test TLS/SSL',
          description: 'Validate TLS/SSL certificate and connection',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['target'],
                  properties: {
                    target: { type: 'string', example: 'google.com' },
                    port: { type: 'number', example: 443 },
                    timeout: { type: 'number', example: 10000 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'TLS test results', content: { 'application/json': { schema: { $ref: '#/components/schemas/ToolResult' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/tools/letsencrypt': {
        post: {
          tags: ['Tools'],
          summary: 'Let\'s Encrypt certificate',
          description: 'Manage Let\'s Encrypt SSL certificates',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['domain'],
                  properties: {
                    domain: { type: 'string', example: 'example.com' },
                    email: { type: 'string', example: 'admin@example.com' },
                    challengeType: { type: 'string', enum: ['http-01', 'dns-01'], example: 'http-01' },
                    staging: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Certificate management results', content: { 'application/json': { schema: { $ref: '#/components/schemas/ToolResult' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/tools/tcpdump': {
        post: {
          tags: ['Tools'],
          summary: 'Packet capture',
          description: 'Capture network packets with tcpdump',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    interface: { type: 'string', example: 'eth0' },
                    filter: { type: 'string', example: 'port 80' },
                    count: { type: 'number', example: 100 },
                    timeout: { type: 'number', example: 30000 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Packet capture results', content: { 'application/json': { schema: { $ref: '#/components/schemas/ToolResult' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '403': { description: 'Forbidden', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/tools/iperf': {
        post: {
          tags: ['Tools'],
          summary: 'Network bandwidth test',
          description: 'Test network bandwidth using iperf3',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['mode'],
                  properties: {
                    mode: { type: 'string', enum: ['client', 'server'], example: 'client' },
                    target: { type: 'string', example: 'iperf.example.com' },
                    port: { type: 'number', example: 5201 },
                    duration: { type: 'number', example: 10 },
                    parallel: { type: 'number', example: 1 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Bandwidth test results', content: { 'application/json': { schema: { $ref: '#/components/schemas/ToolResult' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/tools/get_ip_address': {
        post: {
          tags: ['Tools'],
          summary: 'Get server IP address',
          description: 'Detect the server\'s public IPv4 address',
          responses: {
            '200': { description: 'IP address detection results', content: { 'application/json': { schema: { $ref: '#/components/schemas/ToolResult' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/tools/ip_geolocation': {
        post: {
          tags: ['Tools'],
          summary: 'IP geolocation',
          description: 'Get geolocation information for an IP address',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['ip'],
                  properties: {
                    ip: { type: 'string', example: '8.8.8.8' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Geolocation results', content: { 'application/json': { schema: { $ref: '#/components/schemas/ToolResult' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/tools/reverse_dns': {
        post: {
          tags: ['Tools'],
          summary: 'Reverse DNS lookup',
          description: 'Perform reverse DNS (PTR) lookup for an IP address',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['ip'],
                  properties: {
                    ip: { type: 'string', example: '8.8.8.8' },
                    timeout: { type: 'number', example: 5000 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Reverse DNS results', content: { 'application/json': { schema: { $ref: '#/components/schemas/ToolResult' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
