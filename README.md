# MCP Network Testing Server

A comprehensive, secure MCP (Model Context Protocol) server for remote network testing with built-in authentication, validation, and anti-jailbreaking guardrails.

## Motivation

This MCP server was designed to bridge a critical gap when working with AI Agents (Claude Code, Codex, Gemini, Warp, OpenCode, etc.) for server configuration tasks. While these agents excel at generating configuration scripts for SMTP servers, web servers, VPNs with complex routing, and similar infrastructure tasks, they traditionally lacked the ability to validate whether their configurations actually work.

For example, an agent might generate a firewall rule to open a specific port or configure an SSL certificate, but it couldn't verify if the port is actually accessible or if the certificate is properly installed and trusted. By deploying this lightweight MCP server on a minimal cloud instance, agents can now perform real-world network validation tests, enabling them to iterate and self-correct their configurations based on actual results rather than assumptions.

## � Quick Start

Get up and running in under 2 minutes:

```bash
# 1. Clone and install
git clone https://github.com/gtrevize/mcp-network.git
cd mcp-network
npm install

# 2. Generate authentication token
npm run build
export JWT_SECRET="your-secret-key-here"
TOKEN=$(node -e "const { generateTestToken } = require('./dist/auth/jwt.js'); console.log(generateTestToken('quickstart-user', ['admin']));")
export MCP_AUTH_TOKEN="$TOKEN"

# 3. Start interactive testing (no cloud needed!)
npm run dev:client
```

**That's it!** You now have a fully functional network testing environment running locally. Perfect for:
- Testing server configurations with AI agents
- Learning the available network tools
- Validating connectivity before deploying to production
- Experimenting with network diagnostics

For production deployment to cloud instances, see the [Deployment](#deployment) section.

## � Local vs Cloud Deployment

Choose the right deployment approach for your needs:

| Aspect | Local CLI Client | Cloud Deployment |
|--------|------------------|------------------|
| **Setup Time** | < 2 minutes | 10-30 minutes |
| **Cost** | Free | $0-5/month (free tiers) |
| **Use Case** | Development, testing, learning | Production AI agent integration |
| **Internet Required** | For external targets only | Yes, for all operations |
| **Security Risk** | Minimal (local only) | Moderate (public exposure) |
| **AI Agent Integration** | Manual/scripting | Full MCP protocol support |
| **Tool Limitations** | Some tools need local admin | Full functionality |
| **Scalability** | Single user | Multiple concurrent agents |
| **Persistence** | Session-based | Always available |
| **Network Testing** | External targets only | Internal + external targets |

### **When to Use Local CLI Client:**
✅ Learning and experimenting with network tools  
✅ Developing and testing configurations locally  
✅ One-time network diagnostics and troubleshooting  
✅ Validating configurations before cloud deployment  
✅ Cost-sensitive scenarios or proof-of-concept work  

### **When to Use Cloud Deployment:**
✅ Production AI agent workflows  
✅ Automated server configuration and validation  
✅ Testing internal network infrastructure  
✅ Multiple team members or agents need access  
✅ Integration with CI/CD pipelines  
✅ 24/7 availability requirements  

## �📚 Documentation

Comprehensive documentation is available in the [docs/](docs/) directory:
- **[QUICKSTART.md](docs/QUICKSTART.md)** - Get started in 5 minutes
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment guide
- **[AUTH_README.md](docs/AUTH_README.md)** - Authentication & authorization
- **[CONFIG_README.md](docs/CONFIG_README.md)** - Configuration reference
- **[SETUP.md](docs/SETUP.md)** - Detailed setup instructions
- **[CHANGELOG.md](docs/CHANGELOG.md)** - Version history and changes
- **[CLAUDE.md](docs/CLAUDE.md)** - Architecture & development guide

## Features

### 🔒 Security First
- **JWT Authentication & RBAC**: Token-based authentication with role-based access control
- **Input Validation**: Comprehensive validation to prevent injection attacks
- **Anti-Jailbreaking**: Pattern detection and sanitization to prevent malicious input
- **Access Logging**: Complete audit trail of all tool executions
- **Timeout Management**: Configurable timeouts with sensible defaults

### 🛠️ Network Testing Tools (14 Total)

1. **DNS Lookup** - Resolve DNS records (A, AAAA, MX, TXT, etc.)
2. **IP Address Detection** - Get server's public IPv4 address via DNS/API
3. **IP Geolocation** - Get geolocation info for IP addresses (country, city, ISP, coordinates)
4. **iPerf3** - Network bandwidth testing (client/server mode)
5. **Let's Encrypt** - Certificate management with DNS/HTTP challenges
6. **Ping** - Test connectivity and measure latency (IPv4/IPv6)
7. **Port Scanner** - Throttled nmap scanning (single IP only)
8. **Reverse DNS** - PTR record lookup to find hostnames from IP addresses
9. **Tcpdump** - Packet capture with compression
10. **API Testing** - Postman-style HTTP/HTTPS endpoint testing
11. **Port Testing** - Check if specific ports are open
12. **TLS/SSL Testing** - Certificate validation and analysis
13. **Traceroute** - Trace network paths to destinations
14. **WHOIS** - Domain and IP address lookups

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

- `network:api_test` - API testing
- `network:dns` - DNS resolution
- `network:ip_address` - IP detection
- `network:ip_geolocation` - IP geolocation
- `network:iperf` - Bandwidth testing
- `network:letsencrypt` - Certificate management
- `network:ping` - Ping tool
- `network:port_scan` - Port scanning (nmap)
- `network:port_test` - Port testing
- `network:reverse_dns` - Reverse DNS (PTR records)
- `network:tcpdump` - Packet capture
- `network:tls_test` - TLS/SSL testing
- `network:traceroute` - Traceroute tool
- `network:whois` - WHOIS lookups

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

## Interactive CLI Client

For local testing and development, the project includes a comprehensive interactive command-line client that eliminates the need for cloud deployment during development and testing phases.

### Features

- 🎨 **Rich Terminal UI**: Colorized output with formatted tables and structured data
- 🔐 **Built-in Authentication**: JWT token support with interactive prompts
- 📋 **Interactive Tool Selection**: Menu-driven interface for all 14 network tools
- ✅ **Parameter Validation**: Guided input with validation and confirmation
- 📊 **Formatted Results**: Clean, structured output with execution timing
- ⚡ **Real-time Feedback**: Progress indicators and status updates

### Quick Start

```bash
# Development mode (recommended for testing)
npm run dev:client

# Or build and run
npm run build
npm run client
```

### Authentication

The client supports multiple authentication methods:

```bash
# Method 1: Environment variable (recommended)
export MCP_AUTH_TOKEN="your-jwt-token"
npm run dev:client

# Method 2: Command line argument
npm run client -- --token "your-jwt-token"

# Method 3: Interactive prompt (client will ask for token)
npm run dev:client
```

### Generate Test Token

```bash
npm run build
node -e "const { generateTestToken } = require('./dist/auth/jwt.js'); console.log(generateTestToken('cli-user', ['admin']));"
```

### Example Interactive Session

```
╔═══════════════════════════════════════════╗
║     MCP Network Testing Client            ║
║     Interactive Command Line Interface    ║
╚═══════════════════════════════════════════╝

✓ Connected to MCP server (14 tools available)

📋 Available Tools

1. ping - Send ICMP echo requests to test host reachability
2. traceroute - Trace the network path to a destination  
3. dns_lookup - Query DNS records for a domain
4. whois - Get domain registration information
5. ip_geolocation - Get geolocation data for IP addresses
...

? Select a tool to execute: ping

📝 Parameters for ping
? * target (Hostname or IP address): example.com  
? * count (Number of packets, 1-10): 4

📋 Execution Summary:
Tool: ping
Parameters: { target: "example.com", count: 4 }

? Execute this tool? Yes

⏳ Executing ping...
✓ ping completed (1.2s)

╔════════════════╗
║   ✓ SUCCESS    ║  
╚════════════════╝

Results:
host: example.com
packetsTransmitted: 4
packetsReceived: 4  
packetLoss: 0%
avgRtt: 25.3ms

? Execute another tool? No
```

### Benefits for Local Development

- **No Cloud Deployment Required**: Test all functionality locally during development
- **Rapid Iteration**: Instant feedback without deployment cycles  
- **Safe Testing**: Experiment with tools without exposing services publicly
- **Development Workflow**: Perfect for debugging and feature development
- **Cost-Effective**: No cloud instance needed for initial testing and validation

### Client Architecture

The CLI client consists of modular components:

- **Interactive Interface** (`index.ts`): Main orchestration and user flow
- **MCP Connection** (`connection.ts`): Server communication and tool execution  
- **Parameter Prompts** (`prompts.ts`): User input collection and validation
- **Result Formatter** (`formatter.ts`): Colorized output and data presentation

This design allows for both interactive use and potential automation/scripting integration.

## 💡 Real-World Use Cases

### AI Agent Server Configuration Scenarios

**Scenario 1: NGINX with SSL Setup**
```
Agent Task: "Configure NGINX with Let's Encrypt SSL for example.com"

AI Agent Workflow with MCP Network Server:
1. Agent generates NGINX configuration
2. Uses `letsencrypt` tool to obtain SSL certificate
3. Uses `tls_test` tool to verify certificate installation
4. Uses `port_test` tool to confirm ports 80/443 are accessible  
5. Uses `dns_lookup` tool to verify domain points to server
6. Agent iterates configuration based on test results
```

**Scenario 2: VPN Server Validation**
```
Agent Task: "Set up WireGuard VPN with proper routing"

AI Agent Workflow:
1. Agent configures WireGuard server and routing tables
2. Uses `ip_address` tool to get server's public IP
3. Uses `port_test` tool to verify VPN port accessibility
4. Uses `ping` tool to test connectivity through VPN tunnel
5. Uses `traceroute` tool to verify routing paths
6. Agent adjusts firewall rules based on connectivity tests
```

**Scenario 3: Mail Server Configuration**
```
Agent Task: "Configure Postfix SMTP server with proper DNS records"

AI Agent Workflow:
1. Agent sets up Postfix configuration
2. Uses `dns_lookup` tool to verify MX records
3. Uses `reverse_dns` tool to check PTR records
4. Uses `port_test` tool to verify SMTP ports (25, 587, 465)
5. Uses `tls_test` tool to validate SMTP TLS configuration
6. Agent fine-tunes configuration based on DNS and connectivity results
```

**Scenario 4: Load Balancer Health Checks**
```
Agent Task: "Configure HAProxy with health monitoring"

AI Agent Workflow:
1. Agent generates HAProxy configuration with backend servers
2. Uses `ping` tool to verify backend server connectivity
3. Uses `port_test` tool to check backend service ports
4. Uses `test_api` tool to validate HTTP health check endpoints
5. Uses `tls_test` tool for HTTPS backend verification
6. Agent adjusts backend weights and health check intervals
```

### Benefits Over Traditional Approaches

**Without MCP Network Server:**
- Agent generates configuration → Human manually tests → Human reports back to agent → Agent adjusts
- Multiple manual intervention cycles
- Prone to human error in testing
- Slow iteration cycles

**With MCP Network Server:**
- Agent generates configuration → Agent tests automatically → Agent self-corrects → Repeats until success
- Fully automated validation loop
- Consistent, repeatable testing
- Rapid iteration and convergence

## Performance & Limitations

### Resource Usage
- **Memory**: < 100MB typical usage, < 200MB peak during intensive operations
- **CPU**: Minimal baseline usage, spikes during tool execution (1-5 seconds typical)
- **Network**: Depends on tools used; packet capture and bandwidth testing use more resources
- **Concurrent Executions**: Single-threaded tool execution to prevent resource conflicts

### Tool-Specific Limitations
- **Port Scanner**: Limited to single IP addresses (no subnet scanning)
- **Tcpdump**: Requires elevated privileges on most systems
- **iPerf3**: Server mode requires available port and firewall configuration
- **Let's Encrypt**: Subject to ACME API rate limits (5 duplicate certificates per week)
- **DNS Tools**: Limited by upstream DNS server response times and availability

### Recommended Limits
- **Maximum execution time**: 60 seconds per tool (configurable)
- **Concurrent clients**: Single client connection (MCP protocol limitation)
- **File sizes**: Tcpdump captures limited to 100MB by default
- **Request rate**: No built-in rate limiting beyond tool-specific throttling

### Scaling Considerations
For high-volume usage consider:
- Deploy multiple instances behind a load balancer
- Implement external rate limiting (nginx, cloudflare)
- Use dedicated instances for bandwidth-intensive tools (iperf3, tcpdump)
- Monitor disk space for packet captures and logs

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

## Important Caveat

**SMTP Testing Limitation:** While not related to the MCP server functionality itself, it's important to note that most cloud providers block outbound connections on port 25/tcp by default to prevent spam and abuse. This limitation will affect SMTP server testing and email delivery validation.

While resolving this limitation is beyond the scope of this documentation, solutions exist including:
- Requesting port 25 unblocking from your cloud provider (available with most major providers)
- Choosing cloud providers that don't impose this restriction by default
- Using alternative SMTP ports (587, 465) for testing when applicable

Consult your cloud provider's documentation for their specific policies and procedures regarding SMTP traffic.

## Deployment

This MCP server has rock-bottom minimal system requirements, making it ideal for deployment on always-on, always-free cloud instances. The lightweight Node.js application typically uses less than 100MB of RAM and minimal CPU resources during operation.

> **Disclaimer:** Cloud provider offerings and free tier specifications listed below are accurate as of November 2025 and are subject to change without notice. This information is provided for reference only. Always verify current pricing, availability, and terms directly with your chosen cloud provider.

### Suitable Free Tier Options:

**Oracle Cloud Always Free:**
- ARM Ampere A1 Compute (4 OCPUs, 24GB RAM) - Generous specs, perfect for this use case
- VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM) - More than sufficient for the MCP server

**AWS Free Tier:**
- t2.micro (1 vCPU, 1GB RAM) - 750 hours/month for 12 months
- t3.micro (2 vCPUs, 1GB RAM) - Better performance option

**Google Cloud Free Tier:**
- e2-micro (2 vCPUs, 1GB RAM) - Always free in select regions
- f1-micro (1 vCPU, 0.6GB RAM) - Minimal but functional

**Azure Free Tier:**
- B1S (1 vCPU, 1GB RAM) - 750 hours/month for 12 months

Even the smallest instances provide more than enough resources to run the MCP server alongside basic system services. The server's efficient design ensures reliable operation without consuming significant system resources.

## Security

⚠️ **Important Security Considerations**

While this MCP server implements decent security measures including JWT authentication, input validation, and anti-jailbreaking protections, deploying it on any publicly exposed system (cloud providers, VPS, etc.) introduces inherent security risks.

### Strongly Recommended Security Measures:

**Network-Level Protection:**
- Configure cloud provider security groups/firewalls to restrict access to essential ports only
- Implement IP whitelisting using CIDR blocks to limit access to known networks
- Consider VPN-only access for maximum security

**Instance-Level Security:**
- Enable and configure local firewall (iptables, ufw, Windows Firewall)
- Regularly update the operating system and all dependencies
- Use non-root users for running the service
- Implement fail2ban or similar intrusion detection systems

**Access Control:**
- Use strong, unique JWT secrets
- Regularly rotate authentication tokens
- Monitor access logs for suspicious activity
- Consider implementing additional rate limiting at the network level

**Best Practice:** Deploy the MCP server in a private subnet with access only through a bastion host or VPN connection, rather than exposing it directly to the internet.

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
- Documentation: See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment guide

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
