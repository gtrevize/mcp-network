#!/usr/bin/env node

/**
 * MCP Network Status - Display current server configuration
 * Shows tokens, users, settings in a beautiful, colorized format
 */

import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import { getConfig } from './loader.js';
import { validateNetworkTools } from '../utils/startup-validator.js';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import jwt from 'jsonwebtoken';

interface TokenInfo {
  userId?: string;
  roles?: string[];
  permissions?: string[];
  server?: string;
  iat?: number;
  exp?: number;
  valid: boolean;
  error?: string;
}

function maskSecret(secret: string, visibleChars: number = 8): string {
  if (!secret || secret.length === 0) return chalk.gray('(not set)');
  if (secret === 'CHANGEME') return chalk.red('CHANGEME (⚠️  change this!)');

  const visible = secret.substring(0, visibleChars);
  const masked = '*'.repeat(Math.min(secret.length - visibleChars, 32));
  return chalk.green(visible) + chalk.gray(masked);
}

function decodeToken(token: string, secret: string): TokenInfo {
  try {
    const decoded = jwt.verify(token, secret) as any;
    return {
      userId: decoded.userId,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      server: decoded.server,
      iat: decoded.iat,
      exp: decoded.exp,
      valid: true
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message
    };
  }
}

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return chalk.gray('N/A');
  const date = new Date(timestamp * 1000);
  return chalk.cyan(date.toLocaleString());
}

function displayServerInfo(config: any) {
  console.log(boxen(
    chalk.bold.cyan('MCP Network Testing Server') + '\n' +
    chalk.gray('Configuration Status'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    }
  ));

  const table = new Table({
    head: [chalk.bold('Setting'), chalk.bold('Value')],
    colWidths: [30, 50],
    wordWrap: true,
    style: {
      head: ['cyan'],
      border: ['gray']
    }
  });

  table.push(
    ['Server Name', chalk.green(config.server.name)],
    ['Version', chalk.green(config.server.version)],
    ['Description', chalk.white(config.server.description)],
    ['Environment', chalk.yellow(process.env.NODE_ENV || 'development')],
    ['Log Level', chalk.yellow(config.logging.level)]
  );

  console.log(table.toString());
}

function displayAuthInfo(config: any) {
  console.log('\n' + chalk.bold.yellow('🔐 Authentication & Security\n'));

  const table = new Table({
    head: [chalk.bold('Setting'), chalk.bold('Value')],
    colWidths: [30, 50],
    wordWrap: true,
    style: {
      head: ['yellow'],
      border: ['gray']
    }
  });

  // JWT Secret
  table.push(['JWT Secret', maskSecret(config.jwt.secret, 8)]);

  // AUTH_TOKEN analysis
  const authToken = process.env.AUTH_TOKEN;
  if (authToken && authToken !== 'CHANGEME') {
    const tokenInfo = decodeToken(authToken, config.jwt.secret);

    table.push(['AUTH_TOKEN', maskSecret(authToken, 12)]);

    if (tokenInfo.valid) {
      table.push(
        ['  └─ User ID', chalk.green(tokenInfo.userId || 'unknown')],
        ['  └─ Roles', chalk.cyan(tokenInfo.roles?.join(', ') || 'none')],
        ['  └─ Server', chalk.gray(tokenInfo.server || 'N/A')],
        ['  └─ Issued At', formatTimestamp(tokenInfo.iat)],
        ['  └─ Expires', tokenInfo.exp ? formatTimestamp(tokenInfo.exp) : chalk.gray('Never')]
      );
    } else {
      table.push(['  └─ Status', chalk.red(`❌ Invalid: ${tokenInfo.error}`)]);
    }
  } else {
    table.push(['AUTH_TOKEN', chalk.red('Not set or CHANGEME')]);
  }

  // Security settings
  table.push(
    ['Jailbreak Detection', config.security.jailbreakDetection ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled')],
    ['Input Validation', config.security.inputValidation ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled')],
    ['Allowed IPs', config.security.allowedIPs.length > 0 ? chalk.cyan(config.security.allowedIPs.join(', ')) : chalk.gray('All IPs allowed')]
  );

  console.log(table.toString());
}

function displayApiInfo(config: any) {
  console.log('\n' + chalk.bold.magenta('🌐 REST API Configuration\n'));

  const table = new Table({
    head: [chalk.bold('Setting'), chalk.bold('Value')],
    colWidths: [30, 50],
    wordWrap: true,
    style: {
      head: ['magenta'],
      border: ['gray']
    }
  });

  const apiEnabled = process.env.API_ENABLED !== 'false';
  const apiPort = process.env.API_PORT || '3001';
  const apiUrl = process.env.API_URL || `http://localhost:${apiPort}`;

  table.push(
    ['API Server', apiEnabled ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled')],
    ['API Port', chalk.cyan(apiPort)],
    ['API URL', chalk.cyan(apiUrl)],
    ['CORS Origin', process.env.CORS_ORIGIN || chalk.gray('Same-origin only')],
    ['Rate Limiting', config.rateLimit.enabled ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled')]
  );

  if (config.rateLimit.enabled) {
    table.push(
      ['  └─ Max Requests', chalk.yellow(config.rateLimit.maxRequests.toString())],
      ['  └─ Window (ms)', chalk.yellow(config.rateLimit.windowMs.toString())]
    );
  }

  console.log(table.toString());
}

function displayLetsEncryptInfo(config: any) {
  console.log('\n' + chalk.bold.blue('🔒 Let\'s Encrypt (SSL/TLS)\n'));

  const table = new Table({
    head: [chalk.bold('Setting'), chalk.bold('Value')],
    colWidths: [30, 50],
    wordWrap: true,
    style: {
      head: ['blue'],
      border: ['gray']
    }
  });

  const email = config.letsencrypt.email;
  const hasValidEmail = email && email !== '' && email !== 'CHANGEME';

  table.push(
    ['Status', hasValidEmail ? chalk.green('✓ Configured') : chalk.yellow('⚠️  Not configured')],
    ['Email', hasValidEmail ? chalk.green(email) : chalk.gray('(not set)')],
    ['Environment', config.letsencrypt.production ? chalk.red('Production') : chalk.yellow('Staging')]
  );

  if (!hasValidEmail) {
    table.push(['Note', chalk.gray('letsencrypt tool will be disabled')]);
  }

  console.log(table.toString());
}

function displayToolsInfo(config: any) {
  console.log('\n' + chalk.bold.green('🔧 Network Tools Status\n'));

  const toolValidation = validateNetworkTools(config);

  const availableTable = new Table({
    head: [chalk.bold.green('Available Tools'), chalk.bold('Status')],
    colWidths: [30, 50],
    style: {
      head: ['green'],
      border: ['gray']
    }
  });

  const disabledTable = new Table({
    head: [chalk.bold.red('Disabled Tools'), chalk.bold('Reason')],
    colWidths: [30, 50],
    wordWrap: true,
    style: {
      head: ['red'],
      border: ['gray']
    }
  });

  // Sort tools into available and disabled
  const availableTools: string[] = [];
  const disabledTools: Array<{name: string, reason: string}> = [];

  Object.entries(toolValidation.toolStatus).forEach(([name, status]) => {
    if (status.available) {
      availableTools.push(name);
      const warning = status.warning ? chalk.yellow(` (${status.warning})`) : '';
      availableTable.push([chalk.green(`✓ ${name}`), chalk.gray('Ready') + warning]);
    } else {
      disabledTools.push({ name, reason: status.reason || 'Unknown' });
      disabledTable.push([chalk.red(`✗ ${name}`), chalk.yellow(status.reason || 'Unknown')]);
    }
  });

  console.log(availableTable.toString());

  if (disabledTools.length > 0) {
    console.log('\n' + disabledTable.toString());
  }

  console.log('\n' + chalk.bold(`Total: ${chalk.green(availableTools.length)} available, ${chalk.red(disabledTools.length)} disabled`));
}

function displayEnvFileInfo() {
  console.log('\n' + chalk.bold.gray('📁 Environment File Location\n'));

  const globalEnvPath = join(homedir(), '.mcp-network.env');
  const localEnvPath = join(process.cwd(), '.env');

  const table = new Table({
    head: [chalk.bold('Location'), chalk.bold('Status')],
    colWidths: [40, 40],
    style: {
      head: ['gray'],
      border: ['gray']
    }
  });

  if (existsSync(globalEnvPath)) {
    table.push([chalk.cyan(globalEnvPath), chalk.green('✓ Found (Global)')]);
  } else {
    table.push([chalk.gray(globalEnvPath), chalk.gray('Not found')]);
  }

  if (existsSync(localEnvPath)) {
    table.push([chalk.cyan(localEnvPath), chalk.green('✓ Found (Local)')]);
  } else {
    table.push([chalk.gray(localEnvPath), chalk.gray('Not found')]);
  }

  console.log(table.toString());
}

async function main() {
  try {
    console.clear();

    const config = getConfig();

    displayServerInfo(config);
    displayAuthInfo(config);
    displayApiInfo(config);
    displayLetsEncryptInfo(config);
    displayToolsInfo(config);
    displayEnvFileInfo();

    console.log('\n' + boxen(
      chalk.green('✓ Configuration loaded successfully') + '\n' +
      chalk.gray('Run ') + chalk.cyan('mcp-network-setup') + chalk.gray(' to reconfigure'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'green'
      }
    ));

  } catch (error) {
    console.error(chalk.red('\n❌ Error loading configuration:\n'));
    if (error instanceof Error) {
      console.error(chalk.yellow(error.message));
    }
    process.exit(1);
  }
}

main();
