# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a secure MCP (Model Context Protocol) server for remote network testing. It provides 14 network diagnostic and testing tools with comprehensive security features including JWT authentication, RBAC (Role-Based Access Control), input validation, and anti-jailbreaking guardrails.

## Common Commands

### Development
```bash
npm run build          # Build TypeScript to dist/
npm run dev            # Run with auto-reload (tsx)
npm start              # Run production build
```

### Testing
```bash
npm test               # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report (70% threshold)
```

### Code Quality
```bash
npm run lint           # Check code style
npm run lint:fix       # Auto-fix linting issues
```

### Authentication Token Generation
```bash
npm run build
node -e "const jwt = require('./dist/auth/jwt.js'); console.log(jwt.generateTestToken('user-id', ['admin']));"
```

## Architecture

### Core Structure

**MCP Server Flow** (src/index.ts):
1. Request received via stdio transport
2. JWT token extracted from `MCP_AUTH_TOKEN` environment variable
3. Token verified and auth context created with userId, roles, permissions
4. Tool permissions checked against user's RBAC permissions
5. Tool executed with input validation
6. Result logged to AccessLogger
7. Response returned as JSON

**Security Layers**:
1. **JWT Authentication** (src/auth/jwt.ts): Token verification, RBAC with 5 roles (admin, network_engineer, developer, auditor, readonly)
2. **Input Validation** (src/middleware/validation.ts): Joi-based validation, shell injection detection, path traversal prevention
3. **Anti-Jailbreaking**: Pattern matching for malicious commands (rm -rf, eval, exec, etc.)
4. **Access Logging** (src/logger/index.ts): In-memory log store (last 10k entries), structured logging with pino

### Tool Implementation Pattern

All tools in `src/tools/` follow this structure:
```typescript
export async function toolName(options: ToolOptions): Promise<ToolResult> {
  const startTime = Date.now();

  // 1. Validate inputs using middleware/validation.ts functions
  const validation = validateHost(options.target);
  if (!validation.valid) return error response;

  // 2. Build system command with sanitized inputs
  const command = `system-tool ${sanitized-args}`;

  // 3. Execute via executeCommand() helper with timeout
  const { stdout } = await executeCommand(command, timeout);

  // 4. Parse output into structured data
  const data = parseOutput(stdout);

  // 5. Return ToolResult with success, data, executionTime, timestamp
  return { success: true, data, executionTime, timestamp };
}
```

### Key Components

**Permission System** (src/auth/jwt.ts):
- Each tool mapped to permission (e.g., `ping` → `network:ping`)
- Roles mapped to permission sets in `ROLE_PERMISSIONS`
- Admin role bypasses all permission checks
- Token includes `roles[]` and `permissions[]` arrays

**Validation Functions** (src/middleware/validation.ts):
- `validateHost()`: IPv4/IPv6/hostname validation + jailbreak check
- `validatePort()`: Range 1-65535
- `validateUrl()`: HTTP/HTTPS only + jailbreak check
- `validateTimeout()`: Min 1000ms, respects max per tool
- `validateCount()`: Min 1, respects max per tool

**Command Execution** (src/utils/helpers.ts):
- `executeCommand()`: Wraps `child_process.exec` with timeout via AbortController
- 10MB buffer limit for output
- Logs all command executions at debug level

**Logging** (src/logger/index.ts):
- Pino logger with pretty printing in development
- AccessLogger tracks: timestamp, requestId, userId, tool, parameters, success, duration, error
- In-memory store queryable by user/tool

### Testing Strategy

Tests use Jest with ts-jest ESM preset:
- **Auth tests** (src/__tests__/auth.test.ts): Token verification, permission checks, role validation
- **Validation tests** (src/__tests__/validation.test.ts): Input sanitization, malicious pattern detection
- **Logger tests** (src/__tests__/logger.test.ts): Access log storage and retrieval

70% coverage threshold enforced for branches, functions, lines, statements.

## Environment Configuration

Required environment variables:
- `JWT_SECRET`: Secret key for JWT verification (change default in production!)
- `MCP_AUTH_TOKEN`: JWT token for current user/session

Optional:
- `LOG_LEVEL`: debug/info/warn/error (default: info)
- `NODE_ENV`: development/production
- `ACCESS_LOG_FILE`: Path for access logs
- `LETSENCRYPT_PRODUCTION`: true/false for Let's Encrypt staging/production

## Adding New Tools

1. Create tool file in `src/tools/` following the pattern above
2. Import in `src/index.ts`
3. Add tool definition to `TOOLS` array with inputSchema
4. Add permission constant to `PERMISSIONS` in `src/auth/jwt.ts`
5. Map tool name to permission in `TOOL_PERMISSIONS`
6. Add tool to role permission sets as appropriate
7. Add case to switch statement in `executeTool()`

## Security Considerations

- All tool inputs validated before command execution
- Shell arguments sanitized via regex to prevent injection
- Commands executed with timeouts to prevent hanging
- Some tools (nmap, tcpdump) may require sudo/capabilities
- Port scanner limited to single IPs (no CIDR ranges) with throttling
- Let's Encrypt uses staging by default to avoid rate limits

## TypeScript Configuration

ES Modules with Node16 module resolution. Build outputs to `dist/` with source maps and declarations. Strict mode enabled with noUnusedLocals, noUnusedParameters, noImplicitReturns, noFallthroughCasesInSwitch.
