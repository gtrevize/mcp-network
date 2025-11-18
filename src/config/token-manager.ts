#!/usr/bin/env node

/**
 * MCP Network Token Manager - Manage JWT tokens
 * Full CRUD operations for authentication tokens
 */

import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import { Command } from 'commander';
import inquirer from 'inquirer';
import jwt from 'jsonwebtoken';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { getConfig } from './loader.js';

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

interface TokenGenerationOptions {
  userId: string;
  roles: string[];
  server?: string;
  expiresIn?: string;
}

function getEnvPath(): string {
  const globalEnvPath = join(homedir(), '.mcp-network.env');
  const localEnvPath = join(process.cwd(), '.env');

  if (existsSync(globalEnvPath)) {
    return globalEnvPath;
  } else if (existsSync(localEnvPath)) {
    return localEnvPath;
  }

  // Default to global if neither exists
  return globalEnvPath;
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

function generateToken(options: TokenGenerationOptions, jwtSecret: string): string {
  const payload = {
    userId: options.userId,
    roles: options.roles,
    server: options.server || 'mcp-network'
  };

  const signOptions: any = {};
  if (options.expiresIn) {
    signOptions.expiresIn = options.expiresIn;
  }

  return jwt.sign(payload, jwtSecret, signOptions);
}

async function confirmShowToken(): Promise<boolean> {
  console.log('\n' + chalk.red.bold('⚠️  WARNING: Security Risk\n'));
  console.log(chalk.yellow('You are about to display the full unmasked token.'));
  console.log(chalk.yellow('This will show sensitive authentication information in plain text.\n'));

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Are you sure you want to display the full unmasked token?',
      default: false
    }
  ]);

  return confirmed;
}

async function listTokens(): Promise<void> {
  console.clear();
  console.log(boxen(
    chalk.bold.cyan('Token Information') + '\n' +
    chalk.gray('Current Authentication Token Details'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    }
  ));

  const config = getConfig();
  const authToken = process.env.AUTH_TOKEN;

  if (!authToken || authToken === 'CHANGEME') {
    console.log(chalk.red('\n❌ No valid AUTH_TOKEN found in environment.\n'));
    console.log(chalk.gray('Run ') + chalk.cyan('mcp-network-token generate') + chalk.gray(' to create a new token.\n'));
    return;
  }

  const tokenInfo = decodeToken(authToken, config.jwt.secret);

  const table = new Table({
    head: [chalk.bold('Property'), chalk.bold('Value')],
    colWidths: [25, 55],
    wordWrap: true,
    style: {
      head: ['cyan'],
      border: ['gray']
    }
  });

  if (tokenInfo.valid) {
    table.push(
      ['Status', chalk.green('✓ Valid')],
      ['User ID', chalk.green(tokenInfo.userId || 'unknown')],
      ['Roles', chalk.cyan(tokenInfo.roles?.join(', ') || 'none')],
      ['Server', chalk.gray(tokenInfo.server || 'N/A')],
      ['Issued At', formatTimestamp(tokenInfo.iat)],
      ['Expires', tokenInfo.exp ? formatTimestamp(tokenInfo.exp) : chalk.gray('Never')],
      ['Token (masked)', chalk.yellow(authToken.substring(0, 20) + '...' + authToken.substring(authToken.length - 10))]
    );
  } else {
    table.push(
      ['Status', chalk.red('❌ Invalid')],
      ['Error', chalk.yellow(tokenInfo.error || 'Unknown error')]
    );
  }

  console.log(table.toString());

  console.log('\n' + chalk.gray('Use ') + chalk.cyan('mcp-network-token show --full') +
              chalk.gray(' to display the complete unmasked token.\n'));
}

async function showToken(showFull: boolean): Promise<void> {
  console.clear();

  const authToken = process.env.AUTH_TOKEN;

  if (!authToken || authToken === 'CHANGEME') {
    console.log(chalk.red('\n❌ No valid AUTH_TOKEN found in environment.\n'));
    return;
  }

  if (showFull) {
    const confirmed = await confirmShowToken();

    if (!confirmed) {
      console.log(chalk.gray('\nToken display cancelled.\n'));
      return;
    }

    console.log('\n' + boxen(
      chalk.bold.yellow('Full Authentication Token') + '\n\n' +
      chalk.yellow(authToken),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'yellow'
      }
    ));

    console.log(chalk.gray('\nYou can copy this token for use in API requests or client connections.\n'));
  } else {
    console.log(chalk.yellow('\nMasked Token:'));
    console.log(chalk.gray(authToken.substring(0, 20) + '...' + authToken.substring(authToken.length - 10)));
    console.log(chalk.gray('\nUse --full flag to display the complete token.\n'));
  }
}

async function generateNewToken(): Promise<void> {
  console.clear();
  console.log(boxen(
    chalk.bold.green('Generate New Token') + '\n' +
    chalk.gray('Create a new JWT authentication token'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'green'
    }
  ));

  const config = getConfig();

  // Prompt for token details
  const answers: any = await inquirer.prompt([
    {
      type: 'input',
      name: 'userId',
      message: 'Enter user ID:',
      default: 'admin',
      validate: (input: any) => {
        if (!input || input.trim() === '') {
          return 'User ID is required';
        }
        return true;
      }
    },
    {
      type: 'checkbox',
      name: 'roles',
      message: 'Select roles (space to select, enter to confirm):',
      choices: [
        { name: 'admin', checked: true },
        { name: 'user', checked: false },
        { name: 'operator', checked: false },
        { name: 'readonly', checked: false }
      ],
      validate: (input: any) => {
        if (input.length === 0) {
          return 'At least one role is required';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'server',
      message: 'Server name (optional):',
      default: 'mcp-network'
    },
    {
      type: 'list',
      name: 'expiration',
      message: 'Token expiration:',
      choices: [
        { name: 'Never expires', value: '' },
        { name: '1 hour', value: '1h' },
        { name: '24 hours', value: '24h' },
        { name: '7 days', value: '7d' },
        { name: '30 days', value: '30d' },
        { name: '1 year', value: '365d' }
      ],
      default: ''
    }
  ] as any);

  const tokenOptions: TokenGenerationOptions = {
    userId: answers.userId,
    roles: answers.roles,
    server: answers.server,
    expiresIn: answers.expiration || undefined
  };

  const token = generateToken(tokenOptions, config.jwt.secret);

  console.log('\n' + chalk.green('✓ Token generated successfully!\n'));

  // Ask if user wants to save to .env
  const { saveToEnv } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'saveToEnv',
      message: 'Save this token to your .env file?',
      default: true
    }
  ]);

  if (saveToEnv) {
    const envPath = getEnvPath();
    let envContent = '';

    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, 'utf-8');
    }

    // Update or add AUTH_TOKEN
    const authTokenRegex = /^AUTH_TOKEN=.*$/m;
    if (authTokenRegex.test(envContent)) {
      envContent = envContent.replace(authTokenRegex, `AUTH_TOKEN=${token}`);
    } else {
      envContent += `\nAUTH_TOKEN=${token}\n`;
    }

    writeFileSync(envPath, envContent, 'utf-8');
    console.log(chalk.green(`✓ Token saved to ${envPath}\n`));
  }

  // Show token details
  const { showToken } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'showToken',
      message: 'Display the full token now?',
      default: false
    }
  ]);

  if (showToken) {
    console.log('\n' + boxen(
      chalk.bold.yellow('Generated Token') + '\n\n' +
      chalk.yellow(token),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'yellow'
      }
    ));
  }

  console.log(chalk.gray('\nToken Summary:'));
  const table = new Table({
    head: [chalk.bold('Property'), chalk.bold('Value')],
    colWidths: [25, 55],
    style: {
      head: ['green'],
      border: ['gray']
    }
  });

  table.push(
    ['User ID', chalk.green(tokenOptions.userId)],
    ['Roles', chalk.cyan(tokenOptions.roles.join(', '))],
    ['Server', chalk.gray(tokenOptions.server || 'N/A')],
    ['Expires', tokenOptions.expiresIn ? chalk.yellow(tokenOptions.expiresIn) : chalk.gray('Never')]
  );

  console.log(table.toString());
  console.log();
}

async function deleteToken(): Promise<void> {
  console.clear();
  console.log(boxen(
    chalk.bold.red('Delete Token') + '\n' +
    chalk.gray('Remove AUTH_TOKEN from .env file'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'red'
    }
  ));

  const envPath = getEnvPath();

  if (!existsSync(envPath)) {
    console.log(chalk.yellow('\n⚠️  No .env file found.\n'));
    return;
  }

  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: chalk.red('Are you sure you want to delete the AUTH_TOKEN from your .env file?'),
      default: false
    }
  ]);

  if (!confirmed) {
    console.log(chalk.gray('\nToken deletion cancelled.\n'));
    return;
  }

  let envContent = readFileSync(envPath, 'utf-8');

  // Remove AUTH_TOKEN line
  const authTokenRegex = /^AUTH_TOKEN=.*$\n?/m;
  envContent = envContent.replace(authTokenRegex, '');

  writeFileSync(envPath, envContent, 'utf-8');

  console.log(chalk.green(`\n✓ AUTH_TOKEN removed from ${envPath}\n`));
  console.log(chalk.yellow('Note: You will need to generate a new token to use the server.\n'));
}

async function updateToken(): Promise<void> {
  console.clear();
  console.log(boxen(
    chalk.bold.blue('Update Token') + '\n' +
    chalk.gray('Regenerate token with new settings'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'blue'
    }
  ));

  const config = getConfig();
  const currentToken = process.env.AUTH_TOKEN;

  if (currentToken && currentToken !== 'CHANGEME') {
    const tokenInfo = decodeToken(currentToken, config.jwt.secret);

    if (tokenInfo.valid) {
      console.log(chalk.gray('\nCurrent Token Information:'));
      const table = new Table({
        head: [chalk.bold('Property'), chalk.bold('Value')],
        colWidths: [25, 55],
        style: {
          head: ['blue'],
          border: ['gray']
        }
      });

      table.push(
        ['User ID', chalk.green(tokenInfo.userId || 'unknown')],
        ['Roles', chalk.cyan(tokenInfo.roles?.join(', ') || 'none')],
        ['Server', chalk.gray(tokenInfo.server || 'N/A')]
      );

      console.log(table.toString());
      console.log();
    }
  } else {
    console.log(chalk.yellow('\n⚠️  No valid current token found.\n'));
  }

  console.log(chalk.gray('Enter new token settings:\n'));

  await generateNewToken();
}

async function main() {
  const program = new Command();

  program
    .name('mcp-network-token')
    .description('Manage MCP Network authentication tokens')
    .version('0.1.12');

  program
    .command('list')
    .alias('ls')
    .description('List current token information')
    .action(listTokens);

  program
    .command('show')
    .description('Show current token')
    .option('--full', 'Display full unmasked token (requires confirmation)')
    .action((options) => showToken(options.full || false));

  program
    .command('generate')
    .alias('gen')
    .description('Generate a new token')
    .action(generateNewToken);

  program
    .command('update')
    .description('Update/regenerate current token')
    .action(updateToken);

  program
    .command('delete')
    .alias('del')
    .description('Delete current token from .env file')
    .action(deleteToken);

  // Default command (no arguments)
  if (process.argv.length === 2) {
    await listTokens();
  } else {
    await program.parseAsync(process.argv);
  }
}

main().catch((error) => {
  console.error(chalk.red('\n❌ Error:\n'));
  if (error instanceof Error) {
    console.error(chalk.yellow(error.message));
  }
  process.exit(1);
});
