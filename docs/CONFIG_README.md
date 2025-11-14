# Configuration System

The MCP Network Testing Server uses a hierarchical configuration system with three layers:

1. **Environment Variables** (`.env` file) - Base configuration
2. **Configuration File** (`config.json`) - Overrides .env values
3. **Runtime Environment** - Can override both

## Quick Start

### 1. Create Your Configuration

```bash
# Copy the sample .env file
cp env.sample .env

# Edit .env and replace ALL CHANGEME values
nano .env
```

**IMPORTANT**: The server will refuse to start if any `CHANGEME` values are detected!

### 2. Required Configuration

You MUST change these values in `.env`:

```bash
JWT_SECRET=your-secure-random-secret-here
LETSENCRYPT_EMAIL=your-email@example.com
```

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

### 3. Optional: Create config.json

```bash
# Initialize with defaults
npm run config init

# Or copy the sample
cp config.json.sample config.json
```

## Configuration Layers

### Layer 1: .env File

Base configuration stored in `.env` file:

```bash
# JWT Authentication
JWT_SECRET=my-secret-key-12345

# Server Configuration
NODE_ENV=production
LOG_LEVEL=info

# Tool Configuration
TOOL_PING_ENABLED=true
TOOL_NMAP_ENABLED=false

# Let's Encrypt
LETSENCRYPT_PRODUCTION=false
LETSENCRYPT_EMAIL=admin@example.com
```

### Layer 2: config.json

Advanced configuration that overrides .env values:

```json
{
  "jwt": {
    "secret": null,
    "tokenExpiration": "24h"
  },
  "tools": {
    "ping": { "enabled": true, "maxTimeout": 10000 },
    "nmap": { "enabled": false }
  },
  "tokens": {
    "admin-token-1": {
      "enabled": true,
      "userId": "admin",
      "roles": ["admin"],
      "description": "Primary admin token",
      "createdAt": "2025-01-01T00:00:00Z",
      "expiresAt": "2026-01-01T00:00:00Z",
      "token": "eyJhbGc..."
    }
  }
}
```

**Note**: When `config.json` values are `null`, the `.env` value is used.

### Layer 3: Runtime Environment

Environment variables set at runtime override everything:

```bash
JWT_SECRET=override-secret npm start
```

## Configuration Management CLI

The `mcp-config` CLI tool helps manage your configuration:

### Initialize Configuration

```bash
npm run config init
```

Creates `config.json` with default values.

### View Configuration

```bash
npm run config show
```

Displays current configuration (with secrets masked).

### Token Management

#### List All Tokens

```bash
npm run config list
# or
npm run config ls
```

Shows all configured tokens with their status, expiration, and description.

#### Create a New Token

```bash
npm run config create
# or
npm run config add
```

Interactive wizard that:
1. Asks for token ID (unique identifier)
2. Asks for user ID
3. Lets you select roles (admin, developer, readonly, etc.)
4. Asks for description
5. Sets expiration period (24h, 7d, 30d, 1y)
6. Optionally generates JWT token

#### View Token Details

```bash
npm run config view
```

Shows complete details for a selected token, including the JWT string.

#### Enable/Disable Token

```bash
npm run config toggle
```

Temporarily enable or disable a token without deleting it.

#### Delete Token

```bash
npm run config delete
# or
npm run config rm
```

Permanently removes a token from configuration.

#### Regenerate Token

```bash
npm run config regenerate
# or
npm run config regen
```

Creates a new JWT token for an existing token configuration with a new expiration.

## Token Configuration

Tokens in `config.json` have the following properties:

```json
{
  "token-id": {
    "enabled": true,           // Can be disabled without deletion
    "userId": "user-123",      // User identifier
    "roles": ["admin"],        // Array of roles
    "description": "My token", // Human-readable description
    "createdAt": "2025-01-01T00:00:00Z",  // ISO 8601 timestamp
    "expiresAt": "2026-01-01T00:00:00Z",  // ISO 8601 timestamp
    "token": "eyJhbGc..."      // JWT string (optional)
  }
}
```

### Token Status

A token is considered valid when:
1. `enabled: true`
2. Current date < `expiresAt`
3. JWT token is present and valid

## Available Roles

- **admin** - Full access to all tools and operations
- **network_engineer** - Access to most network diagnostic tools
- **developer** - Access to development and testing tools
- **auditor** - Read-only access to network diagnostics
- **readonly** - Minimal access (ping, DNS, IP lookup)

## Configuration Validation

The server performs validation on startup:

### Canary Value Detection

Any `CHANGEME` values will cause the server to refuse to start:

```
Configuration validation failed:
  - JWT_SECRET must be changed from default CHANGEME value
  - LETSENCRYPT_EMAIL must be changed from default CHANGEME value
```

### Security Validation

- JWT secret must be at least 32 characters
- Rate limit values must be positive
- Tool configurations must be valid

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT signing | `openssl rand -base64 32` |
| `LETSENCRYPT_EMAIL` | Email for Let's Encrypt | `admin@example.com` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment: development/production/test |
| `LOG_LEVEL` | `info` | Logging level: debug/info/warn/error |
| `MAX_TIMEOUT` | `30000` | Maximum timeout for operations (ms) |
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |

### Tool Enable/Disable

Each tool can be enabled/disabled:

```bash
TOOL_PING_ENABLED=true
TOOL_TRACEROUTE_ENABLED=true
TOOL_NMAP_ENABLED=false
TOOL_TCPDUMP_ENABLED=false
```

## Production Deployment

### 1. Set Strong JWT Secret

```bash
# Generate secure secret
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET" > .env
```

### 2. Configure Let's Encrypt

```bash
LETSENCRYPT_PRODUCTION=true
LETSENCRYPT_EMAIL=admin@yourdomain.com
```

### 3. Disable Dangerous Tools

```bash
TOOL_TCPDUMP_ENABLED=false
TOOL_NMAP_ENABLED=false
TOOL_IPERF_ENABLED=false
```

### 4. Enable Rate Limiting

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

### 5. Restrict IP Access (Optional)

```bash
ALLOWED_IPS=192.168.1.0/24,10.0.0.0/8
```

## Troubleshooting

### Server Refuses to Start

**Error**: `JWT_SECRET must be changed from default CHANGEME value`

**Solution**: Edit `.env` and replace `CHANGEME` with a secure value:
```bash
# Generate secure secret
openssl rand -base64 32
# Add to .env
JWT_SECRET=<generated-secret>
```

### Token Generation Fails

**Error**: `JWT_SECRET not configured`

**Solution**: Ensure `.env` exists and has a valid `JWT_SECRET`:
```bash
cp env.sample .env
nano .env  # Edit and save
```

### Configuration Not Loading

1. Check file locations:
   ```bash
   ls -la .env config.json
   ```

2. Verify JSON syntax:
   ```bash
   cat config.json | python -m json.tool
   ```

3. Check file permissions:
   ```bash
   chmod 600 .env
   chmod 644 config.json
   ```

## Best Practices

1. **Never commit `.env`** - Add to `.gitignore`
2. **Use strong JWT secrets** - At least 32 random characters
3. **Rotate tokens regularly** - Use expiration dates
4. **Disable unused tools** - Reduce attack surface
5. **Use readonly roles** - For monitoring/auditing
6. **Enable rate limiting** - Prevent abuse
7. **Set appropriate timeouts** - Prevent resource exhaustion

## Examples

### Development Setup

```bash
# .env
JWT_SECRET=$(openssl rand -base64 32)
NODE_ENV=development
LOG_LEVEL=debug
LETSENCRYPT_PRODUCTION=false
LETSENCRYPT_EMAIL=dev@localhost
```

### Production Setup

```bash
# .env
JWT_SECRET=<strong-secret>
NODE_ENV=production
LOG_LEVEL=info
LETSENCRYPT_PRODUCTION=true
LETSENCRYPT_EMAIL=admin@production.com
RATE_LIMIT_ENABLED=true
ALLOWED_IPS=10.0.0.0/8
```

### Creating Admin Token

```bash
npm run config create

# Follow prompts:
Token ID: admin-2025
User ID: admin
Roles: [x] admin
Description: Admin access for 2025
Expires in: 1y
Generate JWT now? Yes
```

### Creating Readonly Token

```bash
npm run config create

# Follow prompts:
Token ID: monitoring
User ID: monitor-bot
Roles: [x] readonly
Description: Monitoring service
Expires in: 30d
Generate JWT now? Yes
```

## Security Considerations

- Store `.env` securely with restricted permissions (`chmod 600`)
- Never log or expose JWT_SECRET
- Use HTTPS in production
- Rotate tokens before expiration
- Monitor access logs for suspicious activity
- Use principle of least privilege for roles

## Support

For issues or questions:
1. Check this README
2. Review `env.sample` for reference
3. Run `npm run config --help`
4. Check server logs for detailed error messages
