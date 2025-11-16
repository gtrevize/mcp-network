# Running as a Daemon

This guide explains how to run MCP Network Testing servers as background daemons that start automatically on system boot.

## Quick Start - PM2 (Recommended)

PM2 is the easiest cross-platform solution:

```bash
# Install PM2 globally
npm install -g pm2

# Start MCP server as daemon
pm2 start mcp-network-server --name mcp-server \
  --env ~/.mcp-network.env

# Start REST API server as daemon
pm2 start mcp-network-api --name mcp-api \
  --env ~/.mcp-network.env

# Save PM2 configuration
pm2 save

# Configure PM2 to start on boot
pm2 startup
```

## Option 1: PM2 Process Manager

### Installation

```bash
npm install -g pm2
```

### Configuration

Create `~/mcp-network-pm2.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'mcp-server',
      script: 'mcp-network-server',
      env_file: '~/.mcp-network.env',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '~/.pm2/logs/mcp-server-error.log',
      out_file: '~/.pm2/logs/mcp-server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'mcp-api',
      script: 'mcp-network-api',
      env_file: '~/.mcp-network.env',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '~/.pm2/logs/mcp-api-error.log',
      out_file: '~/.pm2/logs/mcp-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    }
  ]
};
```

### Start Services

```bash
# Start all services
pm2 start ~/mcp-network-pm2.config.js

# View status
pm2 status

# View logs
pm2 logs mcp-server
pm2 logs mcp-api

# Monitor in real-time
pm2 monit

# Save configuration
pm2 save

# Configure startup on boot
pm2 startup
# Follow the instructions PM2 provides
```

### PM2 Management Commands

```bash
# List all processes
pm2 list

# Stop services
pm2 stop mcp-server
pm2 stop mcp-api

# Restart services
pm2 restart mcp-server
pm2 restart mcp-api

# Delete services
pm2 delete mcp-server
pm2 delete mcp-api

# View logs
pm2 logs
pm2 logs mcp-server --lines 100

# Flush logs
pm2 flush

# Monitor resources
pm2 monit
```

## Option 2: systemd (Linux)

### Create Service File

Create `/etc/systemd/system/mcp-network.service`:

```ini
[Unit]
Description=MCP Network Testing Server
After=network.target
Documentation=https://github.com/gtrevize/mcp-network

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME
EnvironmentFile=/home/YOUR_USERNAME/.mcp-network.env
ExecStart=/usr/bin/env mcp-network-server
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mcp-network

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/tmp

[Install]
WantedBy=multi-user.target
```

### REST API Service

Create `/etc/systemd/system/mcp-network-api.service`:

```ini
[Unit]
Description=MCP Network Testing REST API
After=network.target
Documentation=https://github.com/gtrevize/mcp-network

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME
EnvironmentFile=/home/YOUR_USERNAME/.mcp-network.env
ExecStart=/usr/bin/env mcp-network-api
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mcp-network-api

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/tmp

[Install]
WantedBy=multi-user.target
```

### Enable and Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services (start on boot)
sudo systemctl enable mcp-network
sudo systemctl enable mcp-network-api

# Start services
sudo systemctl start mcp-network
sudo systemctl start mcp-network-api

# Check status
sudo systemctl status mcp-network
sudo systemctl status mcp-network-api

# View logs
sudo journalctl -u mcp-network -f
sudo journalctl -u mcp-network-api -f

# Restart services
sudo systemctl restart mcp-network
sudo systemctl restart mcp-network-api

# Stop services
sudo systemctl stop mcp-network
sudo systemctl stop mcp-network-api
```

## Option 3: launchd (macOS)

### Create Launch Agent

Create `~/Library/LaunchAgents/com.gtrevize.mcp-network.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.gtrevize.mcp-network</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>export $(cat ~/.mcp-network.env | xargs) && mcp-network-server</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/tmp/mcp-network.log</string>

    <key>StandardErrorPath</key>
    <string>/tmp/mcp-network-error.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
```

### REST API Launch Agent

Create `~/Library/LaunchAgents/com.gtrevize.mcp-network-api.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.gtrevize.mcp-network-api</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>export $(cat ~/.mcp-network.env | xargs) && mcp-network-api</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/tmp/mcp-network-api.log</string>

    <key>StandardErrorPath</key>
    <string>/tmp/mcp-network-api-error.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
```

### Load and Start Services

```bash
# Load services
launchctl load ~/Library/LaunchAgents/com.gtrevize.mcp-network.plist
launchctl load ~/Library/LaunchAgents/com.gtrevize.mcp-network-api.plist

# Start services
launchctl start com.gtrevize.mcp-network
launchctl start com.gtrevize.mcp-network-api

# Stop services
launchctl stop com.gtrevize.mcp-network
launchctl stop com.gtrevize.mcp-network-api

# Unload services
launchctl unload ~/Library/LaunchAgents/com.gtrevize.mcp-network.plist
launchctl unload ~/Library/LaunchAgents/com.gtrevize.mcp-network-api.plist

# View logs
tail -f /tmp/mcp-network.log
tail -f /tmp/mcp-network-api.log
```

## Option 4: Docker (All Platforms)

### Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    openssl \
    nmap \
    tcpdump \
    iperf3 \
    bind-tools

# Install package globally
RUN npm install -g @gtrevize/mcp-network

# Create working directory
WORKDIR /app

# Copy environment file
COPY .env /app/.env

# Expose ports
EXPOSE 3001

# Start server
CMD ["sh", "-c", "export $(cat /app/.env | xargs) && mcp-network-both"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  mcp-network:
    build: .
    container_name: mcp-network
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - ./.env:/app/.env:ro
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Start Docker Service

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Restart
docker-compose restart
```

## Monitoring and Logs

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Web dashboard
pm2 install pm2-server-monit
# Access at http://localhost:9615

# Keymetrics (paid service)
pm2 link <secret> <public>
```

### systemd Logs

```bash
# View recent logs
sudo journalctl -u mcp-network -n 100

# Follow logs in real-time
sudo journalctl -u mcp-network -f

# View logs since boot
sudo journalctl -u mcp-network -b

# View logs for specific time range
sudo journalctl -u mcp-network --since "2025-01-01" --until "2025-01-02"
```

### launchd Logs

```bash
# View stdout
tail -f /tmp/mcp-network.log

# View stderr
tail -f /tmp/mcp-network-error.log

# Using Console.app (GUI)
open /System/Applications/Utilities/Console.app
```

## Security Considerations

1. **Never expose JWT_SECRET** in process listings
2. **Use environment files** instead of command-line arguments
3. **Run as non-root user** (systemd, PM2)
4. **Enable firewall** for network-facing services
5. **Monitor logs** for suspicious activity
6. **Rotate logs** to prevent disk fill
7. **Update regularly** with `npm update -g @gtrevize/mcp-network`

## Troubleshooting

### Service Won't Start

```bash
# PM2
pm2 logs mcp-server --err
pm2 describe mcp-server

# systemd
sudo systemctl status mcp-network
sudo journalctl -u mcp-network -xe

# launchd
launchctl list | grep mcp-network
tail -f /tmp/mcp-network-error.log
```

### Environment Variables Not Loading

```bash
# Verify environment file
cat ~/.mcp-network.env

# Test manually
export $(cat ~/.mcp-network.env | xargs)
mcp-network-server

# Check PM2 env
pm2 env 0  # Replace 0 with process ID
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3001  # Linux/macOS
netstat -ano | findstr :3001  # Windows

# Kill process
kill -9 <PID>
```

## Performance Tuning

### PM2 Cluster Mode

For better performance on multi-core systems:

```javascript
module.exports = {
  apps: [{
    name: 'mcp-api',
    script: 'mcp-network-api',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env_file: '~/.mcp-network.env',
  }]
};
```

### Resource Limits

```bash
# PM2 memory limit
pm2 start mcp-network-server --max-memory-restart 500M

# systemd memory limit
# Add to service file:
MemoryLimit=500M
```

## Backup and Recovery

```bash
# PM2: Save current configuration
pm2 save
pm2 dump  # Creates ~/.pm2/dump.pm2

# PM2: Restore from backup
pm2 resurrect

# Backup environment file
cp ~/.mcp-network.env ~/.mcp-network.env.backup
```

## Recommended Setup

For production:
1. **PM2** for Node.js process management
2. **systemd** or **launchd** to ensure PM2 starts on boot
3. **nginx** as reverse proxy for REST API
4. **Let's Encrypt** for HTTPS certificates
5. **Log rotation** to manage disk space
6. **Monitoring** with PM2 dashboard or external service

Complete setup script: `/docs/SETUP.md`
