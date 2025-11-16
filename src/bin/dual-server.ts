#!/usr/bin/env node

/**
 * Dual Server Launcher - Runs both MCP and REST API servers
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mcpServer = join(__dirname, '../index.js');
const apiServer = join(__dirname, '../rest-api/server.js');

console.log('🚀 Starting MCP Network Testing - Dual Server Mode');
console.log('================================================\n');

// Start MCP Server
const mcpProcess = spawn('node', [mcpServer], {
  stdio: 'inherit',
  env: { ...process.env }
});

// Start API Server
const apiProcess = spawn('node', [apiServer], {
  stdio: 'inherit',
  env: { ...process.env }
});

// Handle process termination
const cleanup = () => {
  console.log('\n\n🛑 Shutting down servers...');
  mcpProcess.kill();
  apiProcess.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Handle child process exits
mcpProcess.on('exit', (code) => {
  console.error(`\n❌ MCP server exited with code ${code}`);
  apiProcess.kill();
  process.exit(code || 1);
});

apiProcess.on('exit', (code) => {
  console.error(`\n❌ API server exited with code ${code}`);
  mcpProcess.kill();
  process.exit(code || 1);
});
