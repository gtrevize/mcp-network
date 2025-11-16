#!/bin/bash

# Setup script for @gtrevize/mcp-network
# Helps users configure environment for first-time use

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🚀 MCP Network Testing - First Time Setup${NC}\n"

# Determine installation type
if [[ -f "package.json" ]]; then
  INSTALL_TYPE="source"
  ENV_FILE=".env"
  echo -e "${BLUE}Detected: Source installation${NC}"
else
  INSTALL_TYPE="global"
  ENV_FILE="$HOME/.mcp-network.env"
  echo -e "${BLUE}Detected: Global npm installation${NC}"
  echo -e "${YELLOW}Environment file will be created at: $ENV_FILE${NC}\n"
fi

# Check if env file exists
if [[ -f "$ENV_FILE" ]]; then
  echo -e "${YELLOW}Environment file already exists: $ENV_FILE${NC}"
  read -p "Overwrite? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled. Existing configuration preserved."
    exit 0
  fi
fi

# Generate JWT_SECRET
echo -e "\n${GREEN}Generating JWT secret...${NC}"
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
echo "✓ Generated secure JWT_SECRET"

# Prompt for user
read -p "Enter user ID (default: admin): " USER_ID
USER_ID=${USER_ID:-admin}

read -p "Enter role (admin/network_engineer/developer/readonly, default: admin): " ROLE
ROLE=${ROLE:-admin}

# Prompt for Let's Encrypt configuration (optional)
echo -e "\n${BLUE}Let's Encrypt Configuration (Optional)${NC}"
echo "Let's Encrypt allows automatic SSL/TLS certificate management."
echo "If you don't need this feature, you can skip it."
read -p "Configure Let's Encrypt? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  read -p "Enter your email for Let's Encrypt: " LETSENCRYPT_EMAIL
  if [[ -z "$LETSENCRYPT_EMAIL" ]]; then
    echo -e "${YELLOW}No email provided - Let's Encrypt will be disabled${NC}"
    LETSENCRYPT_EMAIL=""
  fi
else
  echo -e "${YELLOW}Let's Encrypt disabled - letsencrypt tool will not be available${NC}"
  LETSENCRYPT_EMAIL=""
fi

# Generate token
echo -e "\n${GREEN}Generating authentication token...${NC}"
export JWT_SECRET="$JWT_SECRET"
if [[ "$INSTALL_TYPE" == "source" ]]; then
  TOKEN=$(npm run generate-token "$USER_ID" "$ROLE" 2>&1 | grep -A1 "^Token:" | tail -1)
else
  TOKEN=$(mcp-network-generate-token "$USER_ID" "$ROLE" 2>&1 | grep -A1 "^Token:" | tail -1)
fi

if [[ -z "$TOKEN" ]]; then
  echo -e "${YELLOW}Warning: Could not generate token automatically${NC}"
  echo "You'll need to generate it manually after setup"
fi

# Create .env file
echo -e "\n${GREEN}Creating environment file: $ENV_FILE${NC}"

cat > "$ENV_FILE" << EOF
# MCP Network Testing Configuration
# Generated: $(date)

# JWT Secret (REQUIRED - keep this secret!)
JWT_SECRET="$JWT_SECRET"

# Authentication Token (REQUIRED)
AUTH_TOKEN="$TOKEN"

# Server Configuration
LOG_LEVEL=info
NODE_ENV=production

# REST API Configuration
API_PORT=3001
API_ENABLED=true
API_RATE_LIMIT_MAX=100
API_RATE_LIMIT_WINDOW_MS=60000

# CORS Configuration (comma-separated origins, or * for all, empty for same-origin only)
# WARNING: Using * is insecure for production
CORS_ORIGIN=

# Optional: Let's Encrypt Configuration
# Leave LETSENCRYPT_EMAIL empty to disable the letsencrypt tool
LETSENCRYPT_PRODUCTION=false
LETSENCRYPT_EMAIL="$LETSENCRYPT_EMAIL"
EOF

echo "✓ Environment file created"

# For global install, create startup script
if [[ "$INSTALL_TYPE" == "global" ]]; then
  STARTUP_SCRIPT="$HOME/mcp-network-start.sh"

  cat > "$STARTUP_SCRIPT" << 'EOF'
#!/bin/bash
# MCP Network Testing - Startup Script
# Loads environment and starts the server

# Load environment
set -a
source ~/.mcp-network.env
set +a

# Start server (change to mcp-network-api or mcp-network-both as needed)
mcp-network-server
EOF

  chmod +x "$STARTUP_SCRIPT"
  echo "✓ Created startup script: $STARTUP_SCRIPT"

  echo -e "\n${GREEN}Setup complete!${NC}\n"
  echo -e "${YELLOW}To start the MCP server:${NC}"
  echo "  $STARTUP_SCRIPT"
  echo ""
  echo -e "${YELLOW}Or manually:${NC}"
  echo "  export \$(cat ~/.mcp-network.env | xargs) && mcp-network-server"
  echo ""
  echo -e "${YELLOW}To start the REST API server:${NC}"
  echo "  export \$(cat ~/.mcp-network.env | xargs) && mcp-network-api"
  echo ""
  echo -e "${YELLOW}To start both servers:${NC}"
  echo "  export \$(cat ~/.mcp-network.env | xargs) && mcp-network-both"

else
  echo -e "\n${GREEN}Setup complete!${NC}\n"
  echo -e "${YELLOW}To start the MCP server:${NC}"
  echo "  npm start"
  echo ""
  echo -e "${YELLOW}To start the REST API server:${NC}"
  echo "  npm run api"
  echo ""
  echo -e "${YELLOW}To start both servers:${NC}"
  echo "  npm run start:both"
fi

echo ""
echo -e "${YELLOW}Configuration saved in:${NC} $ENV_FILE"
echo -e "${YELLOW}User:${NC} $USER_ID"
echo -e "${YELLOW}Role:${NC} $ROLE"
