import inquirer from 'inquirer';
import chalk from 'chalk';

export interface ToolParameter {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

export class ParameterPrompts {
  static async getToolParameters(toolName: string, schema: any): Promise<Record<string, any>> {
    console.log(chalk.cyan.bold(`\n📝 Parameters for ${toolName}\n`));

    const parameters: Record<string, any> = {};

    if (!schema || !schema.properties) {
      return parameters;
    }

    const required = schema.required || [];

    for (const [paramName, paramSchema] of Object.entries(schema.properties)) {
      const param = paramSchema as any;
      const isRequired = required.includes(paramName);

      // Skip if not required and user wants to skip
      if (!isRequired) {
        const { shouldProvide } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldProvide',
            message: `Provide optional parameter "${paramName}"?`,
            default: false
          }
        ]);

        if (!shouldProvide) continue;
      }

      const value = await this.promptForParameter(paramName, param, isRequired);
      if (value !== null && value !== undefined && value !== '') {
        parameters[paramName] = value;
      }
    }

    return parameters;
  }

  private static async promptForParameter(
    name: string,
    schema: any,
    required: boolean
  ): Promise<any> {
    const description = schema.description || '';
    const type = schema.type;

    const message = required
      ? chalk.yellow('* ') + name + (description ? chalk.gray(` (${description})`) : '') + ':'
      : name + (description ? chalk.gray(` (${description})`) : '') + ':';

    // Handle enum/choices
    if (schema.enum && Array.isArray(schema.enum)) {
      const { value } = await inquirer.prompt([
        {
          type: 'list',
          name: 'value',
          message,
          choices: schema.enum,
          default: schema.default
        }
      ]);
      return value;
    }

    // Handle boolean
    if (type === 'boolean') {
      const { value } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'value',
          message,
          default: schema.default !== undefined ? schema.default : true
        }
      ]);
      return value;
    }

    // Handle number
    if (type === 'number' || type === 'integer') {
      const { value } = await inquirer.prompt([
        {
          type: 'number',
          name: 'value',
          message,
          default: schema.default,
          validate: (input: any) => {
            if (!required && (input === null || input === undefined || input === '')) {
              return true;
            }
            const num = Number(input);
            if (isNaN(num)) {
              return 'Please enter a valid number';
            }
            if (schema.minimum !== undefined && num < schema.minimum) {
              return `Value must be at least ${schema.minimum}`;
            }
            if (schema.maximum !== undefined && num > schema.maximum) {
              return `Value must be at most ${schema.maximum}`;
            }
            return true;
          }
        }
      ]);
      return value;
    }

    // Handle array
    if (type === 'array') {
      const { value } = await inquirer.prompt([
        {
          type: 'input',
          name: 'value',
          message: message + ' (comma-separated)',
          default: schema.default,
          filter: (input: string) => {
            if (!input) return [];
            return input.split(',').map(s => s.trim()).filter(s => s.length > 0);
          }
        }
      ]);
      return value;
    }

    // Handle string and default case
    const { value } = await inquirer.prompt([
      {
        type: 'input',
        name: 'value',
        message,
        default: schema.default,
        validate: (input: any) => {
          if (required && !input) {
            return 'This parameter is required';
          }
          return true;
        }
      }
    ]);

    return value;
  }

  static async selectTool(tools: Array<{ name: string; description?: string }>): Promise<string | null> {
    // Sort tools alphabetically by name
    const sortedTools = [...tools].sort((a, b) => a.name.localeCompare(b.name));

    const choices = [
      ...sortedTools.map(tool => ({
        name: chalk.green(tool.name) + (tool.description ? chalk.gray(' - ' + tool.description) : ''),
        value: tool.name,
        short: tool.name
      })),
      new inquirer.Separator(),
      {
        name: chalk.red('Exit'),
        value: '__exit__',
        short: 'Exit'
      }
    ];

    const { selectedTool } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedTool',
        message: 'Select a tool to execute:',
        choices,
        pageSize: 15
      }
    ]);

    return selectedTool === '__exit__' ? null : selectedTool;
  }

  static async confirmExecution(toolName: string, parameters: Record<string, any>): Promise<boolean> {
    console.log(chalk.cyan.bold('\n📋 Execution Summary:'));
    console.log(chalk.yellow('Tool:') + ' ' + chalk.white(toolName));
    console.log(chalk.yellow('Parameters:'));

    if (Object.keys(parameters).length === 0) {
      console.log(chalk.gray('  (none)'));
    } else {
      for (const [key, value] of Object.entries(parameters)) {
        console.log(`  ${chalk.cyan(key)}: ${chalk.white(JSON.stringify(value))}`);
      }
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Execute this tool?',
        default: true
      }
    ]);

    return confirm;
  }

  static async askContinue(): Promise<boolean> {
    const { continueSession } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueSession',
        message: '\nExecute another tool?',
        default: true
      }
    ]);

    return continueSession;
  }

  static async getServerToken(): Promise<string | null> {
    console.log(chalk.yellow('\n🔐 Server Authentication Required\n'));
    console.log(chalk.gray('The server JWT token is permanent and shared by all clients.'));
    console.log(chalk.gray('Generate with: npm run config generate-server-token'));
    console.log();

    const { method } = await inquirer.prompt([
      {
        type: 'list',
        name: 'method',
        message: 'Provide server JWT token:',
        choices: [
          { name: 'Enter server token now', value: 'enter' },
          { name: 'Use MCP_AUTH_TOKEN from environment', value: 'env' },
          { name: 'Skip (will fail)', value: 'skip' }
        ]
      }
    ]);

    if (method === 'enter') {
      const { token } = await inquirer.prompt([
        {
          type: 'password',
          name: 'token',
          message: 'Enter server JWT token:',
          mask: '*',
          validate: (input: string) => input.length > 0 || 'Token cannot be empty'
        }
      ]);
      return token;
    } else if (method === 'env') {
      return process.env.MCP_AUTH_TOKEN || null;
    }

    return null;
  }

  static async getApiKey(): Promise<string | null> {
    console.log(chalk.yellow('\n🔑 API Key Required\n'));
    console.log(chalk.gray('Your personal API key identifies you to the server.'));
    console.log(chalk.gray('Create one with: npm run config add-key'));
    console.log();

    const { method } = await inquirer.prompt([
      {
        type: 'list',
        name: 'method',
        message: 'Provide API key:',
        choices: [
          { name: 'Enter API key now', value: 'enter' },
          { name: 'Use MCP_API_KEY from environment', value: 'env' },
          { name: 'Skip (will fail)', value: 'skip' }
        ]
      }
    ]);

    if (method === 'enter') {
      const { key } = await inquirer.prompt([
        {
          type: 'password',
          name: 'key',
          message: 'Enter API key:',
          mask: '*',
          validate: (input: string) => input.length > 0 || 'API key cannot be empty'
        }
      ]);
      return key;
    } else if (method === 'env') {
      return process.env.MCP_API_KEY || null;
    }

    return null;
  }
}
