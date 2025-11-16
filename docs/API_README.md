# REST API Documentation

The MCP Network Testing Server provides a complete REST API for accessing all 14 network testing tools via HTTP/HTTPS.

## Quick Start

```bash
# 1. Start the API server
npm run api

# Or in development mode with auto-reload
npm run dev:api

# 2. Access API documentation
open http://localhost:3001/api-docs

# 3. Test an endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/tools
```

## Configuration

Configure the REST API server via environment variables in `.env`:

```bash
# API Server Configuration
API_PORT=3001                # REST API server port (default: 3000)
API_ENABLED=true             # Enable/disable API server
API_RATE_LIMIT_MAX=100       # Max requests per window
API_RATE_LIMIT_WINDOW_MS=60000  # Rate limit window (1 minute)
```

## Authentication

The API uses the same JWT authentication as the MCP server.

### Headers

Provide your authentication token via one of these headers:

**Option 1: Authorization Bearer** (recommended)
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Option 2: AUTH-TOKEN Header**
```bash
AUTH-TOKEN: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Generate Token

```bash
npm run generate-token <userId> <role>

# Example:
npm run generate-token api-user admin
```

## Base URL

```
http://localhost:3001
```

**Note:** Change port via `API_PORT` in `.env`

## Endpoints

### Health Check

**GET /health** - No authentication required

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-11-15T23:37:00.000Z",
  "uptime": 12345.67,
  "environment": "development"
}
```

### List All Tools

**GET /api/tools** - Authentication required

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/tools
```

Response:
```json
{
  "success": true,
  "tools": [
    {
      "name": "ping",
      "description": "Test connectivity and measure latency",
      "permission": "network:ping"
    },
    ...
  ],
  "userPermissions": ["network:ping", "network:dns", ...]
}
```

### Execute Tools

All tool endpoints follow the pattern: **POST /api/tools/{tool_name}**

## Tool Examples

### Ping

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target":"google.com","count":4}' \
  http://localhost:3001/api/tools/ping
```

Response:
```json
{
  "success": true,
  "data": {
    "target": "google.com",
    "output": "...",
    "statistics": {
      "packetsSent": 4,
      "packetsReceived": 4,
      "packetLoss": 0,
      "minRtt": 6.375,
      "avgRtt": 7.356,
      "maxRtt": 8.337
    }
  },
  "executionTime": 1032,
  "timestamp": "2025-11-15T23:37:42.031Z"
}
```

### DNS Lookup

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target":"example.com","recordType":"A"}' \
  http://localhost:3001/api/tools/dns_lookup
```

### Port Scan

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target":"192.168.1.1","ports":"22,80,443"}' \
  http://localhost:3001/api/tools/port_scan
```

### WHOIS

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target":"example.com"}' \
  http://localhost:3001/api/tools/whois
```

### Test API

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://httpbin.org/get","method":"GET"}' \
  http://localhost:3001/api/tools/test_api
```

### Get IP Address

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/tools/get_ip_address
```

### IP Geolocation

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ip":"8.8.8.8"}' \
  http://localhost:3001/api/tools/ip_geolocation
```

## Available Tools

| Tool | Endpoint | Description |
|------|----------|-------------|
| **ping** | POST /api/tools/ping | Test connectivity and measure latency |
| **traceroute** | POST /api/tools/traceroute | Trace network path to destination |
| **test_port** | POST /api/tools/test_port | Test if a specific port is open |
| **whois** | POST /api/tools/whois | Domain/IP WHOIS lookup |
| **dns_lookup** | POST /api/tools/dns_lookup | DNS record queries |
| **test_api** | POST /api/tools/test_api | HTTP/HTTPS API endpoint testing |
| **port_scan** | POST /api/tools/port_scan | Port scanning with nmap |
| **test_tls** | POST /api/tools/test_tls | TLS/SSL certificate validation |
| **letsencrypt** | POST /api/tools/letsencrypt | Let's Encrypt certificate management |
| **tcpdump** | POST /api/tools/tcpdump | Packet capture |
| **iperf** | POST /api/tools/iperf | Network bandwidth testing |
| **get_ip_address** | POST /api/tools/get_ip_address | Get server public IP address |
| **ip_geolocation** | POST /api/tools/ip_geolocation | IP geolocation lookup |
| **reverse_dns** | POST /api/tools/reverse_dns | Reverse DNS (PTR) lookup |

## Response Format

All tool responses follow this structure:

```json
{
  "success": true|false,
  "data": { ... },           // Tool-specific result data
  "executionTime": 1234,     // Execution time in milliseconds
  "timestamp": "ISO-8601",   // Execution timestamp
  "error": "..."             // Error message (if success is false)
}
```

## Error Responses

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication required. Provide token via \"Authorization: Bearer <token>\" or \"AUTH-TOKEN: <token>\" header."
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Insufficient permissions. Required: network:ping",
  "userPermissions": ["network:dns", "network:whois"]
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Cannot GET /invalid/path",
  "availableEndpoints": {
    "documentation": "/api-docs",
    "health": "/health",
    "tools": "/api/tools"
  }
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

## Interactive API Documentation

The API server includes Swagger UI for interactive documentation:

```
http://localhost:3001/api-docs
```

Features:
- Complete API reference
- Interactive "Try it out" functionality
- Request/response schemas
- Authentication testing
- Example payloads

## Rate Limiting

- Default: 100 requests per minute per IP
- Applies to all `/api/*` endpoints
- Health check `/health` is exempt
- Configure via `API_RATE_LIMIT_MAX` and `API_RATE_LIMIT_WINDOW_MS`

## Security Headers

The API server includes security best practices:
- **Helmet.js**: Security headers (XSS protection, content policy, etc.)
- **CORS**: Configurable cross-origin resource sharing
- **Compression**: Gzip compression for responses
- **Rate Limiting**: IP-based request limiting
- **JWT Verification**: Cryptographic token validation

## RBAC (Role-Based Access Control)

Different roles have different tool permissions:

### Admin
Full access to all tools

### Network Engineer
Access to: ping, traceroute, port_test, whois, dns, port_scan, test_tls, letsencrypt, tcpdump, iperf, ip_address, ip_geolocation, reverse_dns

### Developer
Access to: ping, port_test, dns, test_api, test_tls, ip_address, ip_geolocation, reverse_dns

### Auditor
Access to: ping, traceroute, port_test, whois, dns, test_tls, ip_address, ip_geolocation, reverse_dns

### Readonly
Access to: ping, dns, ip_address, ip_geolocation, reverse_dns

## Usage with AI Agents

The REST API is perfect for AI agent integration:

```python
# Python example
import requests

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
headers = {"Authorization": f"Bearer {TOKEN}"}

# Test connectivity
response = requests.post(
    "http://localhost:3001/api/tools/ping",
    headers=headers,
    json={"target": "example.com", "count": 4}
)

result = response.json()
if result["success"]:
    print(f"Ping successful: {result['data']['statistics']}")
```

## Production Deployment

For production:

1. **Use HTTPS**: Set up reverse proxy (nginx/Apache) with SSL
2. **Change JWT_SECRET**: Use a strong, unique secret key
3. **Set API_PORT**: Use appropriate port (avoid 3000 in production)
4. **Enable firewall**: Restrict access to trusted IPs
5. **Monitor logs**: Set `LOG_LEVEL=info` and configure `ACCESS_LOG_FILE`
6. **Rate limiting**: Adjust based on expected load

Example nginx config:

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Troubleshooting

### Port Already in Use

```bash
# Change port in .env
API_PORT=3002

# Or kill process on port
lsof -ti:3001 | xargs kill -9
```

### Authentication Fails

- Verify token is valid: check expiration and format
- Ensure `JWT_SECRET` matches between token generation and API server
- Check token is in header correctly (include "Bearer " prefix)

### Permission Denied

- Check user's role has required permission
- Admin role bypasses all permission checks
- Generate new token with appropriate role

## Next Steps

- Explore `/api-docs` for complete API reference
- Test endpoints using Swagger UI
- Integrate with your AI agent or automation scripts
- Deploy to production with HTTPS and proper security
