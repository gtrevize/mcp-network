#!/usr/bin/env node

// Suppress all logging output for CLI mode to avoid interfering with interactive prompts
process.env.LOG_LEVEL = 'silent';

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROLES, generateAuthToken } from '../auth/jwt.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'config.json');
const ENV_PATH = path.join(PROJECT_ROOT, '.env');

// Load .env file
if (fs.existsSync(ENV_PATH)) {
  dotenv.config({ path: ENV_PATH });
}

interface ConfigFile {
  server?: any;
  jwt?: any;
  security?: any;
  rateLimit?: any;
  tools?: any;
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
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): ConfigFile {
    const samplePath = path.join(PROJECT_ROOT, 'config.json.sample');
    if (fs.existsSync(samplePath)) {
      try {
        return JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
      } catch {
        return {};
      }
    }
    return {};
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

  public async generateToken(): Promise<void> {
    console.log(chalk.cyan.bold('\n🔐 Generate Authentication Token\n'));

    console.log(chalk.yellow('Generate a JWT token with user identity and roles.'));
    console.log(chalk.yellow('This token will be used for all authentication.\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'userId',
        message: 'User ID:',
        default: 'admin-user',
        validate: (input: string) => input.trim().length > 0 || 'User ID cannot be empty',
      },
      {
        type: 'list',
        name: 'role',
        message: 'Select role:',
        choices: [
          { name: 'Admin (full access)', value: ROLES.ADMIN },
          { name: 'Network Engineer (most network tools)', value: ROLES.NETWORK_ENGINEER },
          { name: 'Developer (basic tools + API testing)', value: ROLES.DEVELOPER },
          { name: 'Auditor (read-only network diagnostics)', value: ROLES.AUDITOR },
          { name: 'Readonly (minimal access)', value: ROLES.READONLY },
        ],
      },
    ]);

    try {
      const token = generateAuthToken(answers.userId, [answers.role]);

      console.log(chalk.green('\n✓ Authentication token generated successfully\n'));
      console.log(chalk.cyan('User ID:'), answers.userId);
      console.log(chalk.cyan('Role:'), answers.role);
      console.log(chalk.gray('\nToken:'));
      console.log(chalk.white(token));
      console.log(chalk.gray('\nSet as environment variable:'));
      console.log(chalk.white(`export AUTH_TOKEN="${token}"`));
      console.log('\n');
    } catch (error) {
      console.error(chalk.red('\n✗ Failed to generate token:'), (error as Error).message);
    }
  }

  public async viewConfig(): Promise<void> {
    console.log(chalk.cyan.bold('\n📋 Current Configuration\n'));

    const displayConfig = JSON.parse(JSON.stringify(this.config));

    // Mask sensitive values
    if (displayConfig.jwt?.secret) {
      displayConfig.jwt.secret = displayConfig.jwt.secret.substring(0, 8) + '...';
    }

    console.log(JSON.stringify(displayConfig, null, 2));
    console.log('');
  }

  public async init(): Promise<void> {
    console.log(chalk.cyan.bold('\n🚀 Initialize MCP Network Configuration\n'));

    console.log(chalk.yellow('This wizard will help you set up the initial configuration.\n'));

    const hasConfig = fs.existsSync(CONFIG_PATH);
    if (hasConfig) {
      const { overwrite } = await inquirer.prompt({
        type: 'confirm',
        name: 'overwrite',
        message: 'config.json already exists. Overwrite?',
        default: false,
      });

      if (!overwrite) {
        console.log(chalk.gray('\nCancelled'));
        return;
      }
    }

    // Create basic config
    this.config = {
      server: {
        name: 'mcp-network',
        version: '1.0.0',
        description: 'MCP Network Testing Server',
      },
      jwt: {},
      security: {
        jailbreakDetection: true,
        inputValidation: true,
      },
      rateLimit: {
        enabled: true,
        maxRequests: 100,
        windowMs: 60000,
      },
    };

    this.saveConfig();

    console.log(chalk.green('\n✓ Configuration initialized\n'));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('1. Set JWT_SECRET in .env file: openssl rand -base64 32'));
    console.log(chalk.gray('2. Generate authentication token: npm run config generate-token'));
  }
}

// CLI Program
const program = new Command();
const cli = new ConfigCLI();

program
  .name('mcp-network-config')
  .description('MCP Network Testing Server Configuration Tool')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize configuration file')
  .action(() => cli.init());

program
  .command('generate-token')
  .alias('gen-token')
  .description('Generate authentication JWT token')
  .action(() => cli.generateToken());

program
  .command('view')
  .alias('show')
  .description('View current configuration')
  .action(() => cli.viewConfig());

program.parse(process.argv);

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
