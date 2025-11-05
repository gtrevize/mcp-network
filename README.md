# MCP Network Testing Server

A comprehensive, secure MCP (Model Context Protocol) server for remote network testing with built-in authentication, validation, and anti-jailbreaking guardrails.

## Features

### 🔒 Security First
- **JWT Authentication & RBAC**: Token-based authentication with role-based access control
- **Input Validation**: Comprehensive validation to prevent injection attacks
- **Anti-Jailbreaking**: Pattern detection and sanitization to prevent malicious input
- **Access Logging**: Complete audit trail of all tool executions
- **Timeout Management**: Configurable timeouts with sensible defaults

### 🛠️ Network Testing Tools

1. **Ping** - Test connectivity and measure latency (IPv4/IPv6)
2. **Traceroute** - Trace network paths to destinations
3. **Port Testing** - Check if specific ports are open
4. **WHOIS** - Domain and IP address lookups
5. **DNS Lookup** - Resolve DNS records (A, AAAA, MX, TXT, etc.)
6. **API Testing** - Postman-style HTTP/HTTPS endpoint testing
7. **Port Scanner** - Throttled nmap scanning (single IP only)
8. **TLS/SSL Testing** - Certificate validation and analysis
9. **Let's Encrypt** - Certificate management with DNS/HTTP challenges
10. **Tcpdump** - Packet capture with compression
11. **iPerf3** - Network bandwidth testing
12. **IP Detection** - Get public IPv4/IPv6 addresses

## Installation

### Prerequisites

- Node.js >= 18.0.0
- System tools: `ping`, `traceroute`, `dig`, `whois`, `nmap`, `tcpdump`, `iperf3`

### Install Dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:

- `JWT_SECRET` - Secret key for JWT token verification
- `MCP_AUTH_TOKEN` - JWT token for authentication (see below)

Optional variables:

- `LOG_LEVEL` - Logging level (default: info)
- `NODE_ENV` - Environment (development/production)
- `ACCESS_LOG_FILE` - Path to access log file
- `LETSENCRYPT_PRODUCTION` - Use production Let's Encrypt (default: false)

### Generating Authentication Tokens

The server requires JWT tokens for authentication. To generate a test token:

```bash
npm run build
node -e "const jwt = require('./dist/auth/jwt.js'); console.log(jwt.generateTestToken('user-id', ['admin']));"
```

Set the generated token in your environment:

```bash
export MCP_AUTH_TOKEN="your-generated-token"
```

### Role-Based Access Control

Available roles:

- **admin** - Full access to all tools
- **network_engineer** - Access to most network testing tools
- **developer** - Access to basic network and API testing tools
- **auditor** - Read-only network analysis tools
- **readonly** - Minimal read-only access

### Permissions

Each tool requires specific permissions:

- `network:ping` - Ping tool
- `network:traceroute` - Traceroute tool
- `network:port_test` - Port testing
- `network:whois` - WHOIS lookups
- `network:dns` - DNS resolution
- `network:api_test` - API testing
- `network:port_scan` - Port scanning (nmap)
- `network:tls_test` - TLS/SSL testing
- `network:letsencrypt` - Certificate management
- `network:tcpdump` - Packet capture
- `network:iperf` - Bandwidth testing
- `network:ip_address` - IP detection

## Usage

### Running the Server

```bash
# Production
npm start

# Development with auto-reload
npm run dev
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "network": {
      "command": "node",
      "args": ["/path/to/mcp-network/dist/index.js"],
      "env": {
        "MCP_AUTH_TOKEN": "your-jwt-token",
        "JWT_SECRET": "your-secret-key"
      }
    }
  }
}
```

### Example Tool Calls

#### Ping

```json
{
  "name": "ping",
  "arguments": {
    "target": "example.com",
    "count": 4
  }
}
```

#### Port Scanner

```json
{
  "name": "port_scan",
  "arguments": {
    "target": "192.168.1.1",
    "ports": "1-1000",
    "throttleMs": 100
  }
}
```

#### API Testing

```json
{
  "name": "test_api",
  "arguments": {
    "url": "https://api.example.com/health",
    "method": "GET",
    "expectedStatus": 200
  }
}
```

#### TLS Certificate Check

```json
{
  "name": "test_tls",
  "arguments": {
    "target": "example.com",
    "port": 443
  }
}
```

## Security Considerations

### Input Validation

All inputs are validated against:
- Shell injection patterns
- Path traversal attempts
- Malicious command sequences
- Null bytes and control characters
- Maximum length constraints

### Rate Limiting

Tools implement various rate limiting strategies:
- Port scanner: Throttled with minimum delay
- API testing: Configurable timeouts
- Let's Encrypt: Subject to ACME rate limits

### Sandboxing

Some tools (like tcpdump and nmap) may require elevated privileges. Consider:
- Running in Docker with appropriate capabilities
- Using sudoers for specific commands only
- Implementing network namespaces for isolation

### Access Logging

All tool executions are logged with:
- Timestamp
- User ID
- Tool name
- Parameters
- Success/failure status
- Execution duration
- Error messages

## Development

### Project Structure

```
src/
├── index.ts              # Main server entry point
├── types/                # TypeScript type definitions
├── auth/                 # JWT authentication and RBAC
├── middleware/           # Validation and guardrails
├── tools/                # Individual tool implementations
├── utils/                # Helper functions
├── logger/               # Logging system
└── __tests__/            # Test suites
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## System Requirements

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y \
  iputils-ping \
  traceroute \
  dnsutils \
  whois \
  nmap \
  tcpdump \
  iperf3
```

### RHEL/CentOS

```bash
sudo yum install -y \
  iputils \
  traceroute \
  bind-utils \
  whois \
  nmap \
  tcpdump \
  iperf3
```

### macOS

```bash
brew install \
  nmap \
  tcpdump \
  iperf3 \
  whois
```

## Troubleshooting

### Permission Denied Errors

Some tools (nmap SYN scan, tcpdump) require root privileges:

```bash
# Run with sudo
sudo npm start

# Or use capabilities (Linux)
sudo setcap cap_net_raw,cap_net_admin=eip /usr/bin/tcpdump
```

### Authentication Errors

Ensure your JWT token is valid and not expired:

```bash
# Check token expiration
node -e "const jwt = require('jsonwebtoken'); console.log(jwt.decode(process.env.MCP_AUTH_TOKEN));"
```

### Tool Not Found

Verify required system tools are installed:

```bash
which ping traceroute dig whois nmap tcpdump iperf3
```

## Contributing

This project follows security best practices. When contributing:

1. Validate all inputs
2. Implement proper error handling
3. Add comprehensive tests
4. Document security considerations
5. Follow the existing code style

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/robursoft/mcp-network/issues
- Documentation: See DEPLOYMENT.md for deployment guide

## Roadmap

- [ ] VPN testing (OpenVPN, WireGuard, IPSec)
- [ ] WebSocket testing
- [ ] SSH connectivity testing
- [ ] Database connectivity testing
- [ ] Cloud provider integration (AWS, Azure)
- [ ] Enhanced Let's Encrypt automation
- [ ] Web UI for management
- [ ] Prometheus metrics export
- [ ] Docker container with proper capabilities

## Security Disclosure

If you discover a security vulnerability, please email security@robursoft.com instead of using the issue tracker.
