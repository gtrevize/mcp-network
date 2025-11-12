#!/usr/bin/env node

// Suppress all logging output for CLI mode to avoid interfering with interactive prompts
process.env.LOG_LEVEL = 'silent';

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROLES } from '../auth/jwt.js';
import { generateApiKey } from '../auth/apikey.js';
import { generateServerToken } from '../auth/jwt.js';
import Table from 'cli-table3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'config.json');

interface ConfigFile {
  server?: any;
  jwt?: any;
  security?: any;
  rateLimit?: any;
  tools?: any;
  apiKeys?: Record<string, any>;
}

class ConfigCLI {
  private config: ConfigFile = {};

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
        this.config = JSON.parse(content);
      } catch (error) {
        console.error(chalk.red('Error loading config.json:'), error);
        this.config = {};
      }
    } else {
      // Initialize with defaults from sample
      this.config = this.getDefaultConfig();
    }

    // Ensure apiKeys object exists
    if (!this.config.apiKeys) {
      this.config.apiKeys = {};
    }
  }

  private getDefaultConfig(): ConfigFile {
    const samplePath = path.join(PROJECT_ROOT, 'config.json.sample');
    if (fs.existsSync(samplePath)) {
      try {
        return JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
      } catch {
        return { apiKeys: {} };
      }
    }
    return { apiKeys: {} };
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
      console.log(chalk.green('✓ Configuration saved to config.json'));
    } catch (error) {
      console.error(chalk.red('✗ Failed to save configuration:'), error);
      throw error;
    }
  }

  public async generateServerToken(): Promise<void> {
    console.log(chalk.cyan.bold('\n🔐 Generate Server JWT Token\n'));

    console.log(chalk.yellow('This will generate a permanent JWT token for server authentication.'));
    console.log(chalk.yellow('All clients must use this token to connect to the server.\n'));

    const { confirm } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'Generate new server token?',
      default: true
    });

    if (!confirm) {
      console.log(chalk.gray('Cancelled'));
      return;
    }

    try {
      const serverToken = generateServerToken();

      // Save to config
      if (!this.config.jwt) {
        this.config.jwt = {};
      }
      this.config.jwt.serverToken = serverToken;
      this.saveConfig();

      console.log(chalk.green('\n✓ Server token generated successfully\n'));
      console.log(chalk.cyan('Server JWT Token:'));
      console.log(chalk.white(serverToken));
      console.log(chalk.gray('\nAdd this to your .env file:'));
      console.log(chalk.white(`JWT_SERVER_TOKEN="${serverToken}"`));
      console.log(chalk.gray('\nOr keep it in config.json (recommended)\n'));
    } catch (error) {
      console.error(chalk.red('\n✗ Failed to generate server token:'), (error as Error).message);
    }
  }

  public async listApiKeys(): Promise<void> {
    console.log(chalk.cyan.bold('\n📋 Configured API Keys\n'));

    const apiKeys = this.config.apiKeys || {};
    const keyIds = Object.keys(apiKeys);

    if (keyIds.length === 0) {
      console.log(chalk.yellow('No API keys configured'));
      console.log(chalk.gray('Run: npm run config add-key'));
      return;
    }

    const table = new Table({
      head: ['Key ID', 'User', 'Roles', 'Status', 'Description'].map(h => chalk.cyan.bold(h)),
      style: { head: [], border: ['gray'] }
    });

    for (const keyId of keyIds) {
      const apiKey = apiKeys[keyId];
      const status = apiKey.enabled ? chalk.green('Active') : chalk.red('Disabled');

      table.push([
        keyId,
        apiKey.userId || 'N/A',
        (apiKey.roles || []).join(', '),
        status,
        apiKey.description || ''
      ]);
    }

    console.log(table.toString());
    console.log();
  }

  public async addApiKey(): Promise<void> {
    console.log(chalk.cyan.bold('\n🔑 Create New API Key\n'));

    const answers: any = {};

    const { keyId } = await inquirer.prompt({
      type: 'input',
      name: 'keyId',
      message: 'API Key ID (unique identifier):',
      validate: (input: string) => {
        if (!input) return 'Key ID is required';
        if (this.config.apiKeys![input]) return 'Key ID already exists';
        return true;
      }
    });
    answers.keyId = keyId;

    const { userId } = await inquirer.prompt({
      type: 'input',
      name: 'userId',
      message: 'User ID:',
      validate: (input: string) => input.length > 0 || 'User ID is required'
    });
    answers.userId = userId;

    const { roles } = await inquirer.prompt({
      type: 'checkbox',
      name: 'roles',
      message: 'Select roles:',
      choices: Object.values(ROLES).map(role => ({ name: role, value: role })),
      validate: (input: any) => (Array.isArray(input) && input.length > 0) || 'At least one role is required'
    });
    answers.roles = roles;

    const { description } = await inquirer.prompt({
      type: 'input',
      name: 'description',
      message: 'Description:',
      default: ''
    });
    answers.description = description;

    const createdAt = new Date().toISOString();
    const apiKey = generateApiKey();

    this.config.apiKeys![answers.keyId] = {
      key: apiKey,
      userId: answers.userId,
      roles: answers.roles,
      enabled: true,
      description: answers.description,
      createdAt
    };

    this.saveConfig();

    console.log(chalk.green('\n✓ API Key created successfully'));
    console.log(chalk.cyan('\n📝 API Key Details:'));
    console.log(chalk.gray('Key ID:'), answers.keyId);
    console.log(chalk.gray('User ID:'), answers.userId);
    console.log(chalk.gray('Roles:'), answers.roles.join(', '));
    console.log(chalk.gray('\nAPI Key:'));
    console.log(chalk.white(apiKey));
    console.log(chalk.gray('\nTo use this key:'));
    console.log(chalk.white(`export MCP_API_KEY="${apiKey}"`));
    console.log();
  }

  public async deleteApiKey(): Promise<void> {
    const apiKeys = Object.keys(this.config.apiKeys || {});

    if (apiKeys.length === 0) {
      console.log(chalk.yellow('\nNo API keys to delete'));
      return;
    }

    const { keyId } = await inquirer.prompt({
      type: 'list',
      name: 'keyId',
      message: 'Select API key to delete:',
      choices: apiKeys
    });

    const { confirm } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: `Delete API key "${keyId}"?`,
      default: false
    });

    if (confirm) {
      delete this.config.apiKeys![keyId];
      this.saveConfig();
      console.log(chalk.green(`\n✓ API key "${keyId}" deleted`));
    } else {
      console.log(chalk.gray('\nCancelled'));
    }
  }

  public async toggleApiKey(): Promise<void> {
    const apiKeys = Object.keys(this.config.apiKeys || {});

    if (apiKeys.length === 0) {
      console.log(chalk.yellow('\nNo API keys configured'));
      return;
    }

    const { keyId } = await inquirer.prompt({
      type: 'list',
      name: 'keyId',
      message: 'Select API key to enable/disable:',
      choices: apiKeys.map(id => ({
        name: `${id} ${this.config.apiKeys![id].enabled ? chalk.green('[enabled]') : chalk.red('[disabled]')}`,
        value: id
      }))
    });

    const apiKey = this.config.apiKeys![keyId];
    apiKey.enabled = !apiKey.enabled;

    this.saveConfig();
    console.log(chalk.green(`\n✓ API key "${keyId}" is now ${apiKey.enabled ? 'enabled' : 'disabled'}`));
  }

  public async viewApiKey(): Promise<void> {
    const apiKeys = Object.keys(this.config.apiKeys || {});

    if (apiKeys.length === 0) {
      console.log(chalk.yellow('\nNo API keys configured'));
      return;
    }

    const { keyId } = await inquirer.prompt({
      type: 'list',
      name: 'keyId',
      message: 'Select API key to view:',
      choices: apiKeys
    });

    const apiKey = this.config.apiKeys![keyId];

    console.log(chalk.cyan.bold(`\n📋 API Key Details: ${keyId}\n`));
    console.log(chalk.gray('User ID:'), apiKey.userId);
    console.log(chalk.gray('Roles:'), apiKey.roles.join(', '));
    console.log(chalk.gray('Status:'), apiKey.enabled ? chalk.green('Enabled') : chalk.red('Disabled'));
    console.log(chalk.gray('Created:'), new Date(apiKey.createdAt).toLocaleString());
    console.log(chalk.gray('Description:'), apiKey.description || 'N/A');
    console.log(chalk.gray('\nAPI Key:'));
    console.log(chalk.white(apiKey.key));
    console.log();
  }

  public async regenerateApiKey(): Promise<void> {
    const apiKeys = Object.keys(this.config.apiKeys || {});

    if (apiKeys.length === 0) {
      console.log(chalk.yellow('\nNo API keys configured'));
      return;
    }

    const { keyId } = await inquirer.prompt({
      type: 'list',
      name: 'keyId',
      message: 'Select API key to regenerate:',
      choices: apiKeys
    });

    const { confirm } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: `Regenerate API key for "${keyId}"? This will invalidate the old key.`,
      default: false
    });

    if (!confirm) {
      console.log(chalk.gray('\nCancelled'));
      return;
    }

    const newKey = generateApiKey();
    this.config.apiKeys![keyId].key = newKey;

    this.saveConfig();

    console.log(chalk.green('\n✓ API key regenerated successfully'));
    console.log(chalk.gray('New API Key:'));
    console.log(chalk.white(newKey));
    console.log();
  }

  public showConfig(): void {
    console.log(chalk.cyan.bold('\n⚙️  Current Configuration\n'));

    // Mask sensitive values
    const displayConfig = JSON.parse(JSON.stringify(this.config));
    if (displayConfig.jwt?.secret) {
      displayConfig.jwt.secret = '***';
    }
    if (displayConfig.jwt?.serverToken) {
      displayConfig.jwt.serverToken = displayConfig.jwt.serverToken.substring(0, 20) + '...';
    }
    if (displayConfig.apiKeys) {
      for (const keyId in displayConfig.apiKeys) {
        displayConfig.apiKeys[keyId].key = displayConfig.apiKeys[keyId].key.substring(0, 16) + '...';
      }
    }

    console.log(JSON.stringify(displayConfig, null, 2));
    console.log();
  }

  public async initConfig(): Promise<void> {
    console.log(chalk.cyan.bold('\n🚀 Initialize Configuration\n'));

    const { confirm } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: 'This will create/overwrite config.json with defaults. Continue?',
      default: false
    });

    if (!confirm) {
      console.log(chalk.gray('Cancelled'));
      return;
    }

    this.config = this.getDefaultConfig();
    this.saveConfig();
    console.log(chalk.green('✓ Configuration initialized'));
    console.log(chalk.yellow('\nNext steps:'));
    console.log(chalk.gray('1. Generate server token: npm run config generate-server-token'));
    console.log(chalk.gray('2. Add API keys: npm run config add-key'));
  }
}

// CLI Program
const program = new Command();
const cli = new ConfigCLI();

program
  .name('mcp-config')
  .description('MCP Network Server Configuration Manager')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize config.json with defaults')
  .action(() => cli.initConfig());

program
  .command('show')
  .description('Show current configuration')
  .action(() => cli.showConfig());

program
  .command('generate-server-token')
  .alias('gen-token')
  .description('Generate permanent server JWT token')
  .action(() => cli.generateServerToken());

program
  .command('list-keys')
  .alias('ls')
  .description('List all API keys')
  .action(() => cli.listApiKeys());

program
  .command('add-key')
  .alias('add')
  .description('Create a new API key')
  .action(() => cli.addApiKey());

program
  .command('delete-key')
  .alias('rm')
  .description('Delete an API key')
  .action(() => cli.deleteApiKey());

program
  .command('toggle-key')
  .description('Enable/disable an API key')
  .action(() => cli.toggleApiKey());

program
  .command('view-key')
  .description('View API key details')
  .action(() => cli.viewApiKey());

program
  .command('regenerate-key')
  .alias('regen')
  .description('Regenerate an API key')
  .action(() => cli.regenerateApiKey());

program.parse();
