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

  static async getAuthToken(): Promise<string | null> {
    const envToken = process.env.AUTH_TOKEN;
    const hasValidEnvToken = envToken && envToken.trim() !== '' && envToken !== 'CHANGEME';

    console.log(chalk.yellow('\n🔐 Authentication Required\n'));

    if (hasValidEnvToken) {
      // Show menu: use env token or enter manually
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Select authentication method:',
          choices: [
            {
              name: 'Use AUTH_TOKEN from environment',
              value: 'env',
              short: 'Use environment token'
            },
            {
              name: 'Enter token manually',
              value: 'manual',
              short: 'Enter manually'
            }
          ]
        }
      ]);

      if (choice === 'env') {
        return envToken;
      }
      // Fall through to manual entry
    } else {
      console.log(chalk.gray('No AUTH_TOKEN found in environment.'));
      console.log(chalk.gray('Generate a token with: npm run config generate-token\n'));
    }

    // Manual entry (either chosen explicitly or because no env token)
    const { token } = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Enter authentication token:',
        mask: '*',
        validate: (input: string) => {
          if (!input || input.trim() === '') {
            return 'Authentication token is required';
          }
          return true;
        }
      }
    ]);

    return token && token.length > 0 ? token : null;
  }

  static async getConnectionMode(): Promise<'mcp' | 'api'> {
    console.log(chalk.yellow('\n🔌 Connection Mode\n'));

    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Select connection mode:',
        choices: [
          {
            name: 'MCP (stdio) - Direct server connection',
            value: 'mcp',
            short: 'MCP'
          },
          {
            name: 'REST API - HTTP/HTTPS connection',
            value: 'api',
            short: 'REST API'
          }
        ],
        default: 'mcp'
      }
    ]);

    return mode;
  }

  static async getApiUrl(): Promise<string> {
    const envApiUrl = process.env.API_URL || 'http://localhost:3001';

    console.log(chalk.yellow('\n🌐 API Configuration\n'));
    console.log(chalk.gray(`Current API_URL from environment: ${envApiUrl}\n`));

    const { useEnvUrl } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useEnvUrl',
        message: `Use API URL from environment (${envApiUrl})?`,
        default: true
      }
    ]);

    if (useEnvUrl) {
      return envApiUrl;
    }

    // Manual entry
    const { apiUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiUrl',
        message: 'Enter API URL (e.g., http://localhost:3001):',
        default: envApiUrl,
        validate: (input: string) => {
          if (!input || input.trim() === '') {
            return 'API URL is required';
          }
          // Basic URL validation
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid URL (e.g., http://localhost:3001)';
          }
        }
      }
    ]);

    return apiUrl;
  }
}
