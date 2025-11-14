# 5-Minute Setup Guide

Get the MCP Network Testing Server running in 5 minutes.

## Prerequisites

- Node.js >= 18.0.0
- npm

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
npm run build
```

### 2. Create Configuration

```bash
# Copy environment template
cp .env.sample .env
```

### 3. Set JWT Secret

Edit `.env` and set JWT_SECRET:

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env
JWT_SECRET="<paste-your-secret-here>"
LETSENCRYPT_EMAIL="your-email@example.com"
```

### 4. Generate Server Token

```bash
npm run config generate-server-token
```

Copy the token it generates. Add it to `.env`:

```bash
JWT_SERVER_TOKEN="eyJhbGc..."
```

### 5. Create Your API Key

```bash
npm run config add-key
```

Follow the prompts:
```
? API Key ID: my-admin-key
? User ID: admin
? Roles: [x] admin
? Description: My admin access key
? Generate JWT now? Yes
```

Copy the API key it generates!

### 6. Set Environment Variables

```bash
# Server token (same for all clients)
export MCP_AUTH_TOKEN="<server-token-from-step-4>"

# Your personal API key
export MCP_API_KEY="<api-key-from-step-5>"
```

### 7. Start the Server

```bash
npm start
```

You should see:
```
Configuration loaded successfully
Starting mcp-network v1.0.0
```

### 8. Test with the Client

In a NEW terminal:

```bash
# Set the same tokens
export MCP_AUTH_TOKEN="<server-token>"
export MCP_API_KEY="<your-api-key>"

# Launch client
npm run client
```

You should see the interactive menu!

## What You Just Did

1. **JWT_SECRET**: Secret key for signing tokens
2. **Server Token**: Permanent token all clients use to connect
3. **API Key**: Your personal key that identifies you and your permissions

## Quick Reference

```bash
# Configuration Management
npm run config generate-server-token  # Generate server JWT token
npm run config add-key                # Create new API key
npm run config list-keys              # List all API keys
npm run config view-key               # View API key details
npm run config toggle-key             # Enable/disable API key

# Running
npm start                              # Start server
npm run client                         # Start interactive client
```

## Next Steps

- Read [AUTH_README.md](AUTH_README.md) for detailed authentication docs
- Read [CONFIG_README.md](CONFIG_README.md) for configuration options
- Read [CLAUDE.md](CLAUDE.md) for architecture details

## Troubleshooting

### Server won't start

```
Configuration validation failed:
  - JWT_SECRET must be changed from default CHANGEME value
```

**Fix**: Edit `.env` and set a real JWT_SECRET (step 3)

### "Server JWT token not provided"

**Fix**: Set environment variable:
```bash
export MCP_AUTH_TOKEN="<your-server-token>"
```

### "API key required"

**Fix**: Set environment variable:
```bash
export MCP_API_KEY="<your-api-key>"
```

### "Permission denied"

Your API key doesn't have the required role. Create a new key with admin role:
```bash
npm run config add-key
# Select admin role
```

## Complete Example

Here's everything in one go:

```bash
# Setup
npm install && npm run build
cp .env.sample .env

# Configure (edit .env and add)
JWT_SECRET="$(openssl rand -base64 32)"
LETSENCRYPT_EMAIL="admin@example.com"

# Generate tokens
npm run config generate-server-token
# Copy output to .env as JWT_SERVER_TOKEN

npm run config add-key
# Follow prompts, copy API key

# Set environment
export MCP_AUTH_TOKEN="<server-token>"
export MCP_API_KEY="<api-key>"

# Run
npm start

# In another terminal
export MCP_AUTH_TOKEN="<server-token>"
export MCP_API_KEY="<api-key>"
npm run client
```

That's it! 🎉
