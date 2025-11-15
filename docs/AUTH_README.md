# Authentication System

The MCP Network Testing Server uses a simple JWT-based authentication system with embedded user identity and roles.

## Overview

A single **AUTH_TOKEN** (JWT) contains:
- User identity (userId)
- Assigned roles (for permission control)
- Server validation (ensures it's for this server)

No separate API keys, no token rotation, no expiration - just one token per user with their permissions built-in.

## Quick Setup

### 1. Set JWT Secret

```bash
cp env.sample .env
# Generate a secure secret
openssl rand -base64 32
# Add to .env
JWT_SECRET=<your-secure-secret>
```

### 2. Generate Authentication Token

```bash
npm run build
npm run config generate-token

# Or use the script directly:
npm run generate-token <userId> <role>
# Example: npm run generate-token alice admin
```

### 3. Use the Token

**Server:**
```bash
# Set the token in .env or environment
export AUTH_TOKEN="<your-generated-token>"

# Start server
npm start
```

**Client:**
```bash
# Option 1: Interactive prompt (recommended)
npm run client
# → Client will prompt to use AUTH_TOKEN or enter manually

# Option 2: Set environment variable (client will offer to use it)
export AUTH_TOKEN="<your-generated-token>"
npm run client

# Option 3: Pass as CLI argument (skips prompt)
npm run client -- --token "<your-generated-token>"
```

## Token Generation

### Interactive Method

```bash
npm run config generate-token
```

This will prompt you for:
- User ID (e.g., "alice", "admin-user", "monitoring-bot")
- Role (admin, network_engineer, developer, auditor, readonly)

### Command Line Method

```bash
npm run generate-token <userId> <role>

# Examples:
npm run generate-token alice admin
npm run generate-token bob developer
npm run generate-token monitor readonly
```

### Programmatic Method

```javascript
import { generateAuthToken } from './dist/auth/jwt.js';

const token = generateAuthToken('userId', ['admin']);
console.log(token);
```

## Available Roles

| Role | Permissions | Use Case |
|------|-------------|----------|
| **admin** | All tools and operations | Full administrator access |
| **network_engineer** | Most network diagnostic tools | Network operations team |
| **developer** | Development and testing tools | Developers needing API testing |
| **auditor** | Read-only network diagnostics | Security auditing, monitoring |
| **readonly** | Minimal access (ping, DNS, IP) | Basic monitoring scripts |

## Authentication Flow

### Server Startup

```
1. Load JWT_SECRET from .env or environment
2. Validate JWT_SECRET exists and is strong (32+ chars)
3. Start server
```

### Client Connection & Tool Execution

```
1. Client provides AUTH_TOKEN (via environment variable)
2. Server validates token signature using JWT_SECRET
3. Server extracts userId and roles from token
4. Server checks user roles for tool permission
5. Tool executes (if authorized)
6. Result returned
```

If token is invalid or user lacks permission, request is rejected.

## Configuration

### Environment Variables

Required:
- `JWT_SECRET` - Secret key for JWT signing (32+ characters recommended)
- `AUTH_TOKEN` - JWT token for authentication

### .env File

```bash
# Required
JWT_SECRET=your-secret-key-here

# Optional - token is typically set at runtime
# AUTH_TOKEN=your-generated-jwt-token
```

### MCP Client Configuration

Example for Claude Desktop:

```json
{
  "mcpServers": {
    "network": {
      "command": "node",
      "args": ["/path/to/mcp-network/dist/index.js"],
      "env": {
        "AUTH_TOKEN": "your-jwt-token-here",
        "JWT_SECRET": "your-secret-key"
      }
    }
  }
}
```

## Security Features

### Token Security

- **Cryptographically Signed**: JWT tokens signed with HMAC-SHA256
- **Server Validation**: Token includes server identifier to prevent cross-server use
- **Role-Based Access**: Permissions checked on every tool execution
- **No Expiration**: Tokens don't expire (revoke by changing JWT_SECRET if needed)

### Validation

- JWT_SECRET must be changed from default "CHANGEME"
- JWT_SECRET should be at least 32 characters for security
- Invalid tokens are rejected immediately
- All tool executions are logged with userId

## Multiple Users

For team usage, generate a token for each user:

```bash
# Admin user
npm run generate-token alice admin
export ALICE_TOKEN="<generated-token>"

# Developer user
npm run generate-token bob developer
export BOB_TOKEN="<generated-token>"

# Readonly user for monitoring
npm run generate-token monitor readonly
export MONITOR_TOKEN="<generated-token>"
```

Each user sets their own token when connecting:

```bash
export AUTH_TOKEN="$ALICE_TOKEN"
npm run client
```

## Token Revocation

To revoke all tokens:

1. Change JWT_SECRET in .env file
2. Restart server
3. Generate new tokens for all users

```bash
# Generate new secret
openssl rand -base64 32 > .env.new
# Replace JWT_SECRET in .env
# Restart server
# Regenerate tokens for all users
```

## Troubleshooting

### "Authentication required: AUTH_TOKEN not provided"

**Cause**: No token in environment

**Fix**:
```bash
# Generate token
npm run config generate-token

# Set environment variable
export AUTH_TOKEN="<generated-token>"
```

### "Invalid authentication token"

**Cause**: Token doesn't match JWT_SECRET or is malformed

**Fix**:
1. Ensure JWT_SECRET in .env matches when token was generated
2. Regenerate token if JWT_SECRET changed:
   ```bash
   npm run config generate-token
   ```

### "Permission denied"

**Cause**: User role doesn't have permission for the requested tool

**Fix**:
1. Check current role in token (it was displayed when generated)
2. Generate new token with appropriate role:
   ```bash
   npm run config generate-token
   # Select a role with required permissions
   ```

## Best Practices

### Development

- Use `admin` role for full access during development
- Keep JWT_SECRET in .env file (not committed to git)
- Generate separate tokens for different testing scenarios

### Production

1. **Strong JWT_SECRET**: Use 32+ random characters
   ```bash
   openssl rand -base64 32
   ```

2. **Minimal Permissions**: Give users the least privileged role needed
   - Use `readonly` for monitoring scripts
   - Use `developer` for testing teams
   - Reserve `admin` for operations team only

3. **Secure Storage**:
   - Never commit tokens to version control
   - Store tokens in secure password managers
   - Use environment variables or secure config management

4. **Audit Logging**: Monitor access logs for suspicious activity
   ```bash
   # Logs include userId from token
   tail -f logs/access.log
   ```

5. **Token Distribution**: Share tokens securely
   - Use encrypted channels (Signal, encrypted email)
   - Never share tokens in plain text chat/email
   - Rotate JWT_SECRET if tokens are compromised

## Example Workflows

### Single User Setup

```bash
# 1. Configure
cp env.sample .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# 2. Build
npm run build

# 3. Generate token
npm run config generate-token
# User ID: my-user
# Role: admin

# 4. Set token
export AUTH_TOKEN="<generated-token>"

# 5. Start server
npm start

# 6. Use client (in another terminal)
export AUTH_TOKEN="<same-token>"
npm run client
```

### Team Setup

```bash
# Admin generates tokens for team
npm run config generate-token  # alice, admin
npm run config generate-token  # bob, developer
npm run config generate-token  # charlie, readonly

# Share tokens securely with team members
# Each member sets their own token:
export AUTH_TOKEN="<their-token>"
npm run client
```

## Support

For authentication issues:
1. Verify JWT_SECRET is set and matches across client/server
2. Regenerate token if unsure
3. Check server logs for detailed error messages
4. Review role permissions in this guide
