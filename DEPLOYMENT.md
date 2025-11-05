# Deployment Guide

This guide covers deploying the MCP Network Server in various environments.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Docker Deployment](#docker-deployment)
3. [Systemd Service](#systemd-service)
4. [Production Considerations](#production-considerations)
5. [Monitoring](#monitoring)
6. [Backup and Recovery](#backup-and-recovery)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/robursoft/mcp-network.git
cd mcp-network
npm install
npm run build
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env
```

Set required variables:
```bash
JWT_SECRET=your-secure-random-secret-here
MCP_AUTH_TOKEN=generated-jwt-token
NODE_ENV=production
LOG_LEVEL=info
```

### 3. Generate JWT Token

```bash
node -e "const jwt = require('./dist/auth/jwt.js'); console.log(jwt.generateTestToken('admin-user', ['admin'], '90d'));"
```

### 4. Start Server

```bash
npm start
```

## Docker Deployment

### Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    iputils \
    bind-tools \
    whois \
    nmap \
    tcpdump \
    iperf3 \
    libcap

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# Set capabilities for network tools
RUN setcap cap_net_raw,cap_net_admin=eip /usr/sbin/tcpdump
RUN setcap cap_net_raw=eip /usr/bin/nmap

# Create non-root user
RUN addgroup -g 1001 -S mcpuser && \
    adduser -u 1001 -S mcpuser -G mcpuser

# Switch to non-root user
USER mcpuser

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mcp-network:
    build: .
    container_name: mcp-network
    restart: unless-stopped
    cap_add:
      - NET_RAW
      - NET_ADMIN
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}
      - LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    networks:
      - mcp-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  mcp-network:
    driver: bridge
```

### Build and Run

```bash
# Build image
docker-compose build

# Start service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop service
docker-compose down
```

## Systemd Service

### Create Service File

```bash
sudo nano /etc/systemd/system/mcp-network.service
```

```ini
[Unit]
Description=MCP Network Testing Server
After=network.target

[Service]
Type=simple
User=mcpuser
Group=mcpuser
WorkingDirectory=/opt/mcp-network
Environment="NODE_ENV=production"
Environment="JWT_SECRET=your-secret-here"
Environment="MCP_AUTH_TOKEN=your-token-here"
ExecStart=/usr/bin/node /opt/mcp-network/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mcp-network

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/mcp-network/logs

# Capabilities needed for network tools
AmbientCapabilities=CAP_NET_RAW CAP_NET_ADMIN

[Install]
WantedBy=multi-user.target
```

### Deploy and Start

```bash
# Create user
sudo useradd -r -s /bin/false mcpuser

# Install application
sudo mkdir -p /opt/mcp-network
sudo cp -r dist node_modules package.json /opt/mcp-network/
sudo chown -R mcpuser:mcpuser /opt/mcp-network

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable mcp-network
sudo systemctl start mcp-network

# Check status
sudo systemctl status mcp-network

# View logs
sudo journalctl -u mcp-network -f
```

## Production Considerations

### 1. Security Hardening

#### JWT Secret Management

```bash
# Generate strong secret
openssl rand -base64 32

# Store in secure location
sudo nano /etc/mcp-network/secrets.env
sudo chmod 600 /etc/mcp-network/secrets.env
sudo chown mcpuser:mcpuser /etc/mcp-network/secrets.env
```

#### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
```

#### File Permissions

```bash
sudo chmod 750 /opt/mcp-network
sudo chmod 640 /opt/mcp-network/.env
```

### 2. Performance Tuning

#### Node.js Options

```bash
# In systemd service or Docker
Environment="NODE_OPTIONS=--max-old-space-size=2048"
```

#### Concurrent Tool Execution

The server supports parallel tool execution. Configure based on server resources:

```javascript
// Adjust in src/index.ts if needed
const MAX_CONCURRENT_TOOLS = 10;
```

### 3. Logging

#### Structured Logging

Configure log levels per environment:

```bash
# Development
LOG_LEVEL=debug

# Production
LOG_LEVEL=info

# High volume
LOG_LEVEL=warn
```

#### Log Rotation

```bash
# Install logrotate config
sudo nano /etc/logrotate.d/mcp-network
```

```
/opt/mcp-network/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 640 mcpuser mcpuser
    sharedscripts
    postrotate
        systemctl reload mcp-network
    endscript
}
```

### 4. Resource Limits

#### Systemd Limits

```ini
[Service]
LimitNOFILE=65536
LimitNPROC=4096
CPUQuota=200%
MemoryLimit=2G
```

#### Docker Limits

```yaml
services:
  mcp-network:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Monitoring

### 1. Health Checks

Create health check endpoint (add to src/index.ts):

```typescript
import { createServer } from 'http';

// Health check server
const healthServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      version: SERVER_VERSION,
      uptime: process.uptime(),
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(3000);
```

### 2. Prometheus Metrics (Future Enhancement)

```typescript
// Example metrics to track
const metrics = {
  toolExecutionCount: new Counter(),
  toolExecutionDuration: new Histogram(),
  toolExecutionErrors: new Counter(),
  activeConnections: new Gauge(),
};
```

### 3. Alerting

#### Systemd Monitoring

```bash
# Alert on service failure
sudo nano /etc/systemd/system/mcp-network-alert@.service
```

```ini
[Unit]
Description=MCP Network Alert Service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/send-alert.sh "MCP Network service failed"
```

### 4. Log Monitoring

```bash
# Watch for errors
journalctl -u mcp-network -f | grep ERROR

# Monitor access logs
tail -f /opt/mcp-network/logs/access.log | jq '.type == "access"'
```

## Backup and Recovery

### 1. Configuration Backup

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR=/var/backups/mcp-network
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup configuration
tar -czf $BACKUP_DIR/config-$DATE.tar.gz \
    /opt/mcp-network/.env \
    /etc/systemd/system/mcp-network.service \
    /etc/mcp-network/

# Backup logs (last 7 days)
find /opt/mcp-network/logs -mtime -7 -type f | \
    tar -czf $BACKUP_DIR/logs-$DATE.tar.gz -T -

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete
```

### 2. Automated Backups

```bash
# Add to crontab
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-mcp-network.sh
```

### 3. Recovery Procedure

```bash
# Stop service
sudo systemctl stop mcp-network

# Restore configuration
sudo tar -xzf /var/backups/mcp-network/config-YYYYMMDD_HHMMSS.tar.gz -C /

# Verify configuration
sudo -u mcpuser node /opt/mcp-network/dist/index.js --validate-config

# Restart service
sudo systemctl start mcp-network
sudo systemctl status mcp-network
```

## Scaling

### Load Balancing

For high-availability deployments:

```yaml
# docker-compose.yml
services:
  mcp-network:
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
```

### Reverse Proxy (Nginx)

```nginx
upstream mcp_network {
    least_conn;
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}

server {
    listen 80;
    server_name mcp-network.example.com;

    location / {
        proxy_pass http://mcp_network;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
sudo journalctl -u mcp-network -n 50

# Verify binary
which node

# Test manually
sudo -u mcpuser /usr/bin/node /opt/mcp-network/dist/index.js
```

### Permission Issues

```bash
# Verify capabilities
getcap /usr/bin/nmap
getcap /usr/sbin/tcpdump

# Re-set if needed
sudo setcap cap_net_raw,cap_net_admin=eip /usr/sbin/tcpdump
```

### High Memory Usage

```bash
# Monitor memory
ps aux | grep node

# Check for memory leaks
node --inspect /opt/mcp-network/dist/index.js

# Restart service
sudo systemctl restart mcp-network
```

## Support

For deployment issues:
- Check logs: `sudo journalctl -u mcp-network`
- Review configuration: `cat /opt/mcp-network/.env`
- Validate setup: `npm run build && npm test`
- Report issues: https://github.com/robursoft/mcp-network/issues
