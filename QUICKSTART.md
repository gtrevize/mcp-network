# Quick Start Guide

Get the MCP Network Testing Server up and running in 5 minutes.

## Prerequisites

- Node.js >= 18.0.0
- npm

## Installation

```bash
# Clone/navigate to the project
cd mcp-network

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### Step 1: Create .env File

```bash
# Copy the sample file
cp .env.sample .env
```

### Step 2: Set Required Values

Edit `.env` and replace `CHANGEME` values:

```bash
# Generate a secure JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Or manually generate
openssl rand -base64 32
```

**Minimum Required Configuration:**

```bash
# In .env file
JWT_SECRET=your-secure-secret-here-at-least-32-chars
LETSENCRYPT_EMAIL=your-email@example.com
```

**⚠️ IMPORTANT**: The server will refuse to start if these are still set to `CHANGEME`!

### Step 3: Initialize Config (Optional)

```bash
# Create config.json with defaults
npm run config init
```

## Create Your First Token

### Option 1: Interactive CLI (Recommended)

```bash
npm run config create

# Follow the prompts:
# - Token ID: my-first-token
# - User ID: admin
# - Roles: [x] admin
# - Description: My first admin token
# - Expires in: 30d
# - Generate JWT now? Yes
```

The CLI will display your JWT token. Copy it!

### Option 2: Quick Script

```bash
npm run generate-token admin my-user-id
```

Copy the generated token from the output.

## Start the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## Test the Configuration

Try to start the server. If you see this error:

```
Configuration validation failed:
  - JWT_SECRET must be changed from default CHANGEME value
```

You need to update `.env` with proper values.

If you see:

```
Configuration loaded successfully
Starting mcp-network v1.0.0
```

Success! Your server is running.

## Use the CLI Client

### Set Your Token

```bash
export MCP_AUTH_TOKEN="your-jwt-token-here"
```

### Launch the Client

```bash
npm run client
```

You'll see an interactive menu:

```
╔═══════════════════════════════════════════╗
║                                           ║
║     MCP Network Testing Client            ║
║     Interactive Command Line Interface    ║
║                                           ║
╚═══════════════════════════════════════════╝

📋 Available Tools

1. ping - Send ICMP echo requests
2. traceroute - Trace network path
3. nslookup - DNS query
...

? Select a tool to execute:
```

Select a tool and follow the prompts!

## Common Commands

```bash
# Server
npm start                    # Start production server
npm run dev                  # Start development server

# CLI Client
npm run client               # Launch interactive client
npm run dev:client           # Launch client in dev mode

# Configuration
npm run config init          # Initialize config.json
npm run config list          # List all tokens
npm run config create        # Create new token
npm run config view          # View token details
npm run config toggle        # Enable/disable token
npm run config delete        # Delete token
npm run generate-token       # Quick token generation

# Development
npm test                     # Run tests
npm run lint                 # Check code style
npm run build                # Build TypeScript
```

## Configuration Management

### List All Tokens

```bash
npm run config list
```

### Create a New Token

```bash
npm run config create
```

### Enable/Disable a Token

```bash
npm run config toggle
```

### View Token Details

```bash
npm run config view
```

### Regenerate Token with New Expiration

```bash
npm run config regenerate
```

## Available Roles

Choose roles when creating tokens:

- **admin** - Full access to all tools
- **network_engineer** - Most network tools (no admin operations)
- **developer** - Development and testing tools
- **auditor** - Read-only network diagnostics
- **readonly** - Minimal access (ping, DNS, IP only)

## Example Workflows

### Create Admin Token for Yourself

```bash
npm run config create

Token ID: admin-john
User ID: john
Roles: [x] admin
Description: John's admin access
Expires in: 1y
Generate JWT now? Yes

# Copy the generated token
export MCP_AUTH_TOKEN="<your-token>"
npm run client
```

### Create Readonly Token for Monitoring

```bash
npm run config create

Token ID: monitoring-bot
User ID: monitor
Roles: [x] readonly
Description: Monitoring service
Expires in: 90d
Generate JWT now? Yes

# Use in monitoring scripts
export MCP_AUTH_TOKEN="<monitoring-token>"
```

### Temporarily Disable a Token

```bash
npm run config toggle
# Select the token to disable
# The token is now inactive but not deleted
```

## Troubleshooting

### Server won't start

**Error**: `JWT_SECRET must be changed from default CHANGEME value`

**Fix**:
```bash
# Generate new secret
openssl rand -base64 32

# Add to .env
echo "JWT_SECRET=<your-secret>" >> .env
```

### Token generation fails

**Error**: `JWT_SECRET not configured`

**Fix**: Ensure `.env` exists and has valid JWT_SECRET
```bash
cp .env.sample .env
# Edit .env and set JWT_SECRET
```

### Client can't connect

**Fix**: Ensure server is running
```bash
# In one terminal
npm start

# In another terminal
export MCP_AUTH_TOKEN="your-token"
npm run client
```

## Next Steps

- Read [CONFIG_README.md](CONFIG_README.md) for detailed configuration options
- Read [CLAUDE.md](CLAUDE.md) for architecture and development guide
- Read [src/client/README.md](src/client/README.md) for CLI client details
- Run `npm run config --help` to see all configuration commands

## Security Checklist

Before going to production:

- [ ] Changed JWT_SECRET from CHANGEME
- [ ] Changed LETSENCRYPT_EMAIL from CHANGEME
- [ ] Generated strong JWT secret (32+ characters)
- [ ] Set NODE_ENV=production
- [ ] Enabled rate limiting
- [ ] Disabled unused tools (tcpdump, nmap if not needed)
- [ ] Set appropriate token expiration dates
- [ ] Secured .env file permissions (`chmod 600 .env`)
- [ ] Added .env to .gitignore
- [ ] Created tokens with least privilege roles

## Getting Help

1. Check error messages in server logs
2. Review [CONFIG_README.md](CONFIG_README.md)
3. Check [CLAUDE.md](CLAUDE.md) for architecture details
4. Run commands with `--help` flag

## Complete Example

```bash
# 1. Setup
npm install
npm run build

# 2. Configure
cp .env.sample .env
nano .env  # Replace CHANGEME values

# 3. Create token
npm run config create
# Follow prompts, copy the JWT token

# 4. Start server
npm start

# 5. Use client (in another terminal)
export MCP_AUTH_TOKEN="your-jwt-token"
npm run client
```

That's it! You're ready to use the MCP Network Testing Server. 🎉
