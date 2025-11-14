# CONTEXT

## Session Information
**Last Updated**: 2025-11-05
**Current Branch**: main
**Last Commit**: 3cf41a4 - Merge pull request #1

## Project Status

### Build Status
✅ **Clean build** - No warnings or errors
- TypeScript compilation: Success
- ESM module resolution: Working correctly
- Strict type checking: Passing
- Output: `dist/` directory with source maps and declarations

### Code Quality Metrics
- **Test Coverage**: 70% threshold configured (branches, functions, lines, statements)
- **Linting**: ESLint with TypeScript plugin configured
- **Type Safety**: Strict mode enabled with all recommended flags

## Key Architecture Decisions

### Module System
- **Type**: ES Modules (ESM)
- **Resolution**: Node16
- **Target**: ES2022
- **Reason**: Modern Node.js compatibility, native ESM support

### Security Architecture
The project uses a 4-layer security model:
1. **JWT Authentication**: Token-based auth with configurable expiration
2. **RBAC**: 5 roles (admin, network_engineer, developer, auditor, readonly)
3. **Input Validation**: Joi schemas + custom validation for network inputs
4. **Anti-Jailbreaking**: Pattern matching for malicious command injection

### Tool Execution Pattern
All tools follow standardized pattern:
1. Input validation → 2. Command building → 3. Execution with timeout → 4. Output parsing → 5. ToolResult response

### Command Execution
- Uses `child_process.exec` with AbortController for timeouts
- 10MB buffer limit to prevent memory issues
- All commands logged at debug level
- Platform-specific handling (Linux vs macOS vs Windows)

## Environment Setup

### Required System Tools
- ping, traceroute, dig, whois (standard on most systems)
- nmap (may require installation)
- tcpdump (requires root/capabilities)
- iperf3 (requires installation)

### Environment Variables
**Critical**:
- `JWT_SECRET`: Must be changed in production (default is insecure)
- `MCP_AUTH_TOKEN`: Required for all requests

**Optional**:
- `LOG_LEVEL`: Controls logging verbosity
- `NODE_ENV`: Affects logger formatting
- `LETSENCRYPT_PRODUCTION`: Controls staging vs production ACME

## Recent Changes

### Session Actions
1. Created comprehensive CLAUDE.md documentation file
2. Verified build process - all clean
3. Established TODO.md and CONTEXT.md tracking files

## Known Issues / Considerations

### Security
- Default JWT_SECRET must be changed in production (warning logs if not changed)
- Some tools (nmap SYN scan, tcpdump) require elevated privileges
- Access logs stored in-memory only (last 10k entries, no persistence)

### Platform Compatibility
- Ping command syntax differs between Linux and macOS/Windows
- Path to system tools may vary (uses `which` to locate)
- Some tools may not be available on all platforms

### Rate Limiting
- Port scanner has throttling (configurable, default 100ms between ports)
- Let's Encrypt subject to ACME rate limits (uses staging by default)
- No global rate limiting per user/session (future enhancement)

## Dependencies

### Core Runtime
- `@modelcontextprotocol/sdk`: ^1.0.4 (MCP protocol implementation)
- `jsonwebtoken`: ^9.0.2 (JWT auth)
- `joi`: ^17.13.3 (input validation)
- `pino`: ^9.5.0 (structured logging)
- `axios`: ^1.7.9 (HTTP client for API testing)
- `acme-client`: ^5.4.0 (Let's Encrypt)
- `node-forge`: ^1.3.1 (TLS/certificate handling)

### Development
- TypeScript: ^5.7.2
- Jest: ^29.7.0 with ts-jest: ^29.2.5
- ESLint: ^9.15.0 with TypeScript plugin
- tsx: ^4.19.2 (dev runtime)

## MCP Client Configuration Example
```json
{
  "mcpServers": {
    "network": {
      "command": "node",
      "args": ["/path/to/mcp-network/dist/index.js"],
      "env": {
        "MCP_AUTH_TOKEN": "your-jwt-token",
        "JWT_SECRET": "your-secret-key"
      }
    }
  }
}
```

## Testing Strategy

### Test Organization
- `src/__tests__/auth.test.ts`: JWT verification, RBAC
- `src/__tests__/logger.test.ts`: Access log functionality
- `src/__tests__/validation.test.ts`: Input sanitization, pattern detection

### Coverage Requirements
All metrics must meet 70% threshold:
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Next Developer Notes

### If Adding New Tools
1. Follow the tool implementation pattern in src/tools/
2. Add permission to PERMISSIONS constant
3. Map tool to permission in TOOL_PERMISSIONS
4. Update ROLE_PERMISSIONS for appropriate roles
5. Add to TOOLS array and executeTool() switch
6. Ensure input validation follows security patterns

### If Modifying Security
- Test all RBAC permission combinations
- Verify validation patterns don't break legitimate inputs
- Check that admin role retains full access
- Update auth tests for any permission changes

### If Changing Build/Deploy
- ES Modules require .js extensions in imports even for .ts files
- Jest requires moduleNameMapper for ESM compatibility
- chmod +x on dist/index.js needed for CLI execution
- MCP clients expect stdio transport on entry point
