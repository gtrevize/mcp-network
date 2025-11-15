# MCP Network Testing CLI Client

An interactive command-line interface for the MCP Network Testing Server with rich TUI and color support.

## Features

- 🎨 Rich terminal UI with colors and formatted output
- 🔐 JWT authentication support
- 📋 Interactive tool selection menu
- ✅ Parameter validation and prompts
- 📊 Formatted results with tables and structured data
- ⚡ Real-time execution feedback

## Installation

```bash
# Build the project
npm run build

# Optionally install globally
npm install -g .
```

## Usage

### Quick Start

```bash
# Run the CLI client
npm run client

# Or use the dev version with auto-reload
npm run dev:client

# If installed globally
mcp-network-cli
```

### Authentication

The client provides interactive authentication with multiple options:

**Option 1: Interactive Prompt (Recommended)**
```bash
npm run client
# Client will prompt with available authentication methods:
# - Use AUTH_TOKEN from environment (if set)
# - Enter token manually
```

**Option 2: CLI Argument (Skip Prompt)**
```bash
npm run client -- --token "your-jwt-token-here"
```

**Option 3: Environment Variable (Interactive Menu)**
```bash
export AUTH_TOKEN="your-jwt-token-here"
npm run client
# Client will offer to use the environment token or enter manually
```

### Custom Server Path

```bash
npm run client -- --server /path/to/server.js
```

## Generating Authentication Token

To generate a JWT token for testing:

```bash
npm run build
npm run config generate-token

# Or use the command line:
npm run generate-token <userId> <role>

# Examples:
npm run generate-token cli-user admin
npm run generate-token test-user readonly
```

## Available Tools

The CLI provides interactive access to all MCP network testing tools:

1. **ping** - Test host reachability with ICMP
2. **traceroute** - Trace network path to destination
3. **nslookup** - DNS query and record lookup
4. **whois** - Domain registration information
5. **dig** - Advanced DNS queries
6. **host** - DNS hostname/IP resolution
7. **curl** - HTTP/HTTPS requests with headers
8. **ssl_check** - TLS/SSL certificate verification
9. **port_scan** - TCP port availability check
10. **nmap** - Network discovery and scanning
11. **tcpdump** - Packet capture and analysis
12. **iperf** - Network bandwidth testing

## Interactive Workflow

1. **Launch**: Start the CLI client
2. **Authenticate**: Interactive prompt offers:
   - Use AUTH_TOKEN from environment (if available)
   - Enter token manually
   - Or use `--token` CLI option to skip prompt
3. **Select Tool**: Choose from the list of available tools
4. **Enter Parameters**: Follow prompts to provide required/optional parameters
5. **Confirm**: Review and confirm execution
6. **View Results**: See formatted, colorized output
7. **Continue**: Execute another tool or exit

## Example Session

```bash
$ npm run client

╔═══════════════════════════════════════════╗
║                                           ║
║     MCP Network Testing Client            ║
║     Interactive Command Line Interface    ║
║                                           ║
╚═══════════════════════════════════════════╝

🔐 Authentication Required

? Select authentication method: (Use arrow keys)
❯ Use AUTH_TOKEN from environment
  Enter token manually

ℹ Server path: /path/to/dist/index.js
⏳ Connecting to MCP server...
✓ Connected to MCP server (14 tools available)

📋 Available Tools

1. ping - Send ICMP echo requests to test host reachability
2. traceroute - Trace the network path to a destination
3. nslookup - Query DNS records for a domain
...

? Select a tool to execute: ping

📝 Parameters for ping

? * target (Hostname or IP address to ping): example.com
? Provide optional parameter "count"? Yes
? * count (Number of ping packets to send (1-10)): 4
? Provide optional parameter "timeout"? No

📋 Execution Summary:
Tool: ping
Parameters:
  target: "example.com"
  count: 4

? Execute this tool? Yes

⏳ Executing ping...
✓ ping completed

╔════════════════╗
║                ║
║   ✓ SUCCESS    ║
║                ║
╚════════════════╝

ping Results

host: example.com
packetsTransmitted: 4
packetsReceived: 4
packetLoss: 0%
minRtt: 23.45ms
avgRtt: 25.12ms
maxRtt: 28.90ms

⏱  Execution time: 3245ms

? Execute another tool? No
ℹ Goodbye!
ℹ Disconnected from server
```

## Command Line Options

```
Usage: mcp-network-cli [options]

Interactive CLI client for MCP Network Testing Server

Options:
  -V, --version          output the version number
  -s, --server <path>    Path to MCP server executable
  -t, --token <token>    JWT authentication token
  -h, --help             display help for command
```

## Color Scheme

- 🟢 **Green**: Success messages, tool names, checkmarks
- 🔵 **Blue**: Info messages, headers
- 🟡 **Yellow**: Warnings, numbers, indices
- 🔴 **Red**: Errors, failures
- 🟦 **Cyan**: Property names, section headers
- ⚪ **White**: Data values, text content
- ⚫ **Gray**: Metadata, timestamps, optional info

## Troubleshooting

### Authentication Errors

If you see authentication errors:
1. Ensure JWT_SECRET is set in your environment
2. Generate a fresh token using the provided script
3. Verify the token hasn't expired

### Connection Errors

If the client can't connect:
1. Check the server path is correct
2. Ensure the server build is up to date (`npm run build`)
3. Verify Node.js version (>=18.0.0)

### Permission Errors

Some tools (nmap, tcpdump) may require elevated privileges:
```bash
sudo npm run client
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev:client

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Run tests
npm test
```

## Architecture

The CLI client consists of:

- **index.ts**: Main entry point and orchestration
- **connection.ts**: MCP client connection management
- **prompts.ts**: Interactive parameter collection
- **formatter.ts**: Result formatting and display
- **menu.ts**: Tool selection interface

## License

MIT
