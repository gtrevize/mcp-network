# Authentication System

The MCP Network Testing Server uses a two-layer authentication system:

1. **Server JWT Token** - Permanent token for server-level authentication (never expires)
2. **API Keys** - Per-user keys for user-level authentication and authorization

## Why Two Layers?

- **Server JWT Token**: Proves the client is authorized to connect to THIS server
- **API Key**: Identifies the user and their permissions

Without a valid server token, the connection is rejected immediately. Without a valid API key, no tools can be executed.

## Quick Setup

### 1. Configure JWT Secret

```bash
cp env.sample .env
# Generate secure secret
openssl rand -base64 32
# Add to .env
JWT_SECRET=<your-secure-secret>
```

### 2. Generate Server Token

```bash
npm run build
npm run config generate-server-token
```

This generates a permanent JWT token. Copy it to `.env` or `config.json`:

```bash
# In .env
JWT_SERVER_TOKEN="eyJhbGciOi..."
```

### 3. Create API Keys

```bash
npm run config add-key

# Follow prompts:
# - Key ID: admin-key
# - User ID: admin
# - Roles: [x] admin
# - Description: Admin access
```

Copy the generated API key!

### 4. Use Both Tokens

```bash
# Set environment variables
export MCP_AUTH_TOKEN="<server-jwt-token>"
export MCP_API_KEY="<your-api-key>"

# Start server
npm start

# In another terminal, start client
npm run client
```

## Server JWT Token

### Characteristics

- **Permanent**: Never expires
- **Shared**: Same token for all clients
- **Required**: Server rejects connections without it
- **Single**: Only one active server token

### Generation

```bash
npm run config generate-server-token
```

This command:
1. Generates a permanent JWT token
2. Saves it to `config.json`
3. Displays it for you to copy

### Storage Options

**Option 1: .env file (Recommended for local)**
```bash
JWT_SERVER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Option 2: config.json (Recommended for deployment)**
```json
{
  "jwt": {
    "serverToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Option 3: Environment variable at runtime**
```bash
MCP_AUTH_TOKEN="eyJhbG..." npm start
```

### Client Usage

Clients must provide the server token:

```bash
# Via environment
export MCP_AUTH_TOKEN="<server-jwt-token>"
npm run client

# Via command line
npm run client -- --token "<server-jwt-token>"
```

## API Keys

### Characteristics

- **Per-User**: Each user has their own API key
- **Roles-Based**: Keys have assigned roles (admin, developer, readonly, etc.)
- **Enable/Disable**: Can be temporarily disabled without deletion
- **Permanent**: Never expire (but can be disabled)

### Management Commands

#### Create API Key
```bash
npm run config add-key
```

Interactive wizard creates a new API key with:
- Unique key ID
- User ID
- One or more roles
- Description

#### List API Keys
```bash
npm run config list-keys
# or
npm run config ls
```

Shows all API keys with status and roles.

#### View API Key Details
```bash
npm run config view-key
```

Shows full details including the actual API key string.

#### Enable/Disable API Key
```bash
npm run config toggle-key
```

Temporarily disable/enable a key without deleting it.

#### Regenerate API Key
```bash
npm run config regenerate-key
# or
npm run config regen
```

Generates a new key value while keeping the same roles/settings.

#### Delete API Key
```bash
npm run config delete-key
# or
npm run config rm
```

Permanently removes an API key.

### Storage

API keys are stored in `config.json`:

```json
{
  "apiKeys": {
    "admin-key-1": {
      "key": "a1b2c3d4e5f6...",
      "userId": "admin",
      "roles": ["admin"],
      "enabled": true,
      "description": "Primary admin key",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

### Client Usage

Clients must provide their API key:

```bash
# Via environment
export MCP_API_KEY="<your-api-key>"
npm run client
```

The client will prompt for the API key if not provided.

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
1. Load configuration (.env + config.json)
2. Validate JWT_SECRET exists
3. Validate JWT_SERVER_TOKEN exists
4. Validate at least one API key configured
5. Start server
```

If any validation fails, server refuses to start.

### Client Connection

```
1. Client provides Server JWT Token
2. Server validates token signature
3. Server checks token type = 'server'
4. Connection established

(Connection rejected if token invalid)
```

### Tool Execution

```
1. Client sends tool request with API Key
2. Server validates API key
3. Server checks if key is enabled
4. Server checks user roles for permission
5. Tool executes
6. Result returned

(Request rejected if API key invalid or insufficient permissions)
```

## Security Features

### Server JWT Token

- Never expires (no token rotation headaches)
- Shared among authorized clients
- Verifies server identity
- Prevents unauthorized server connections

### API Keys

- 64-character random hex strings
- Per-user identification
- Role-based authorization
- Can be disabled without deletion
- No expiration (no renewal required)

### Validation

- Server refuses to start with CHANGEME values
- At least one API key required
- JWT secret must be 32+ characters
- All tokens validated on every request

## Example Workflows

### Setup for Single User

```bash
# 1. Configure
cp env.sample .env
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env
echo "LETSENCRYPT_EMAIL=admin@example.com" >> .env

# 2. Build
npm run build

# 3. Generate server token
npm run config generate-server-token
# Copy the token to .env

# 4. Create your API key
npm run config add-key
# Key ID: my-key
# User ID: me
# Roles: [x] admin
# Copy the API key

# 5. Set environment
export MCP_AUTH_TOKEN="<server-token>"
export MCP_API_KEY="<your-api-key>"

# 6. Start server
npm start

# 7. Use client (in another terminal)
export MCP_AUTH_TOKEN="<server-token>"
export MCP_API_KEY="<your-api-key>"
npm run client
```

### Setup for Team

```bash
# 1. Admin generates server token (once)
npm run config generate-server-token

# 2. Admin creates API keys for each team member
npm run config add-key
# For Alice (admin role)
npm run config add-key
# For Bob (developer role)
npm run config add-key
# For Charlie (readonly role)

# 3. Admin shares:
# - Server JWT token (shared by all)
# - Individual API keys (one per person)

# 4. Each team member sets:
export MCP_AUTH_TOKEN="<shared-server-token>"
export MCP_API_KEY="<their-personal-api-key>"
```

### Disable Compromised Key

```bash
# If an API key is compromised
npm run config toggle-key
# Select the compromised key
# It's now disabled (connections rejected)

# Generate replacement
npm run config add-key
# Create new key for the user

# Or regenerate same key
npm run config regenerate-key
# Generates new value, keeps settings
```

## Troubleshooting

### "Server JWT token not provided"

**Cause**: No server token in environment

**Fix**:
```bash
# Check if token exists
echo $MCP_AUTH_TOKEN

# If empty, generate and set
npm run config generate-server-token
export MCP_AUTH_TOKEN="<generated-token>"
```

### "Invalid server JWT token"

**Cause**: Token doesn't match or JWT_SECRET changed

**Fix**:
1. Ensure JWT_SECRET in .env matches when token was generated
2. Regenerate server token if secret changed:
   ```bash
   npm run config generate-server-token
   ```

### "API key required"

**Cause**: No API key provided

**Fix**:
```bash
# Create API key if none exists
npm run config add-key

# Set API key environment variable
export MCP_API_KEY="<your-api-key>"
```

### "Invalid or disabled API key"

**Cause**: API key doesn't exist or is disabled

**Fix**:
```bash
# Check if key is disabled
npm run config list-keys

# Enable if disabled
npm run config toggle-key

# Or create new key
npm run config add-key
```

### "Permission denied"

**Cause**: User role doesn't have permission for the tool

**Fix**:
1. Check your current roles:
   ```bash
   npm run config view-key
   ```

2. Ask admin to update roles or create key with appropriate role:
   ```bash
   npm run config add-key
   # Select appropriate roles
   ```

## Production Deployment

### Checklist

- [ ] Strong JWT_SECRET (32+ characters)
- [ ] Server JWT token generated and secured
- [ ] API keys created for all users
- [ ] Unnecessary roles disabled
- [ ] config.json in .gitignore
- [ ] .env in .gitignore
- [ ] Server token stored securely (e.g., secrets manager)
- [ ] API keys distributed securely
- [ ] Unused API keys deleted or disabled

### Security Best Practices

1. **Never commit** `.env` or `config.json` to version control
2. **Use strong JWT_SECRET** - Generate with `openssl rand -base64 32`
3. **Rotate API keys** if compromised
4. **Use readonly roles** for monitoring/scripts
5. **Disable unused keys** instead of deleting (audit trail)
6. **Monitor access logs** for suspicious activity
7. **Use HTTPS** for production deployments

## FAQ

**Q: Why do I need both a server token and API key?**
A: Server token proves you're authorized to connect. API key identifies WHO you are and what you can do.

**Q: Can the server token expire?**
A: No. It's permanent. No rotation needed.

**Q: Can API keys expire?**
A: No. They're permanent but can be disabled anytime.

**Q: How do I share access with a team?**
A: Share the same server JWT token, but give each person their own API key.

**Q: What if I lose my API key?**
A: Admin can regenerate it with `npm run config regenerate-key`.

**Q: Can I use multiple API keys?**
A: Each client connection uses one API key. Create multiple keys for different purposes/users.

**Q: How secure are API keys?**
A: 64 random hex characters = 256 bits of entropy. Very secure.

**Q: Can I change my API key role?**
A: Not directly. Create a new key with the desired role, then delete the old one.

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify both server token and API key are set
3. Ensure config validation passes on server startup
4. Review this guide's troubleshooting section
