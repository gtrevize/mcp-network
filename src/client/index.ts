#!/usr/bin/env node

import { Command } from 'commander';
import { MCPConnection } from './connection.js';
import { APIConnection } from './api-connection.js';
import { ParameterPrompts } from './prompts.js';
import { ResultFormatter } from './formatter.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CLIOptions {
  server?: string;
  token?: string;
  mode?: 'mcp' | 'api';
  apiUrl?: string;
}

type Connection = MCPConnection | APIConnection;

class MCPNetworkCLI {
  private connection: Connection | null = null;
  private options: CLIOptions;
  private mode: 'mcp' | 'api' = 'mcp';

  constructor(options: CLIOptions) {
    this.options = options;
    this.mode = options.mode || 'mcp';
  }

  async start(): Promise<void> {
    try {
      // Show header
      ResultFormatter.showHeader();

      // Ask for connection mode if not specified
      if (!this.options.mode) {
        this.mode = await ParameterPrompts.getConnectionMode();
      }

      // Handle authentication token
      // Priority: CLI option > Interactive prompt (which handles env var)
      let authToken = this.options.token;

      if (!authToken) {
        // Always prompt interactively (prompt will handle env var if available)
        try {
          authToken = await ParameterPrompts.getAuthToken() || undefined;
        } catch (promptError: any) {
          // Handle user cancellation (Ctrl+C, EOF, etc.)
          if (promptError.name === 'ExitPromptError' || promptError.message?.includes('force closed')) {
            ResultFormatter.showInfo('\nAuthentication cancelled. Exiting...');
            process.exit(0);
          }
          throw promptError; // Re-throw if it's a different error
        }
      }

      // Connect based on mode
      if (this.mode === 'api') {
        // REST API mode
        let apiUrl = this.options.apiUrl;
        if (!apiUrl) {
          apiUrl = await ParameterPrompts.getApiUrl();
        }

        this.connection = new APIConnection();
        ResultFormatter.showInfo(`Connecting to API server: ${apiUrl}`);
        await this.connection.connect(apiUrl, authToken);
        ResultFormatter.showInfo('✓ Connected to REST API server');
      } else {
        // MCP mode
        const serverPath = this.options.server || path.join(__dirname, '../../dist/index.js');
        ResultFormatter.showInfo(`Server path: ${serverPath}`);

        this.connection = new MCPConnection();
        await this.connection.connect(serverPath, authToken);
        ResultFormatter.showInfo('✓ Connected to MCP server');
      }

      // Main interaction loop
      await this.interactiveLoop();

    } catch (error) {
      if (error instanceof Error) {
        ResultFormatter.formatError(error.message);
        if (error.stack) {
          console.error(error.stack);
        }
      } else {
        ResultFormatter.formatError(String(error));
      }
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  private async interactiveLoop(): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to server');
    }

    let continueSession = true;

    while (continueSession) {
      try {
        // Get available tools
        const tools = this.connection.getTools();

        if (tools.length === 0) {
          ResultFormatter.showWarning('No tools available from server');
          break;
        }

        // Display tools and let user select
        ResultFormatter.formatToolList(tools);
        const selectedTool = await ParameterPrompts.selectTool(tools);

        if (!selectedTool) {
          ResultFormatter.showInfo('Goodbye!');
          break;
        }

        // Find the selected tool
        const tool = tools.find(t => t.name === selectedTool);
        if (!tool) {
          ResultFormatter.formatError(`Tool ${selectedTool} not found`);
          continue;
        }

        // Get parameters for the tool
        const parameters = await ParameterPrompts.getToolParameters(
          tool.name,
          tool.inputSchema
        );

        // Confirm execution
        const confirmed = await ParameterPrompts.confirmExecution(tool.name, parameters);

        if (!confirmed) {
          ResultFormatter.showInfo('Execution cancelled');
          continueSession = await ParameterPrompts.askContinue();
          continue;
        }

        // Execute the tool
        const startTime = Date.now();
        const result = await this.connection.executeTool(tool.name, parameters);
        const executionTime = Date.now() - startTime;

        // Display results
        this.displayResult(tool.name, result, executionTime);

        // Ask if user wants to continue
        continueSession = await ParameterPrompts.askContinue();

      } catch (error: any) {
        // Handle user cancellation (Ctrl+C, EOF, etc.)
        if (error.name === 'ExitPromptError' || error.message?.includes('force closed')) {
          ResultFormatter.showInfo('\nSession cancelled. Goodbye!');
          break;
        }

        if (error instanceof Error) {
          ResultFormatter.formatError(`Error: ${error.message}`);
        } else {
          ResultFormatter.formatError(String(error));
        }

        // Ask if user wants to continue after error
        try {
          continueSession = await ParameterPrompts.askContinue();
        } catch (promptError: any) {
          // Handle cancellation when asking to continue
          if (promptError.name === 'ExitPromptError' || promptError.message?.includes('force closed')) {
            ResultFormatter.showInfo('\nSession cancelled. Goodbye!');
            break;
          }
          throw promptError;
        }
      }
    }
  }

  private displayResult(toolName: string, result: any, executionTime: number): void {
    // MCP tool result format
    if (result && result.content && Array.isArray(result.content)) {
      // Extract the actual result from MCP response
      const content = result.content[0];

      if (content && content.type === 'text') {
        try {
          // Try to parse as JSON
          const data = JSON.parse(content.text);

          if (data.success) {
            ResultFormatter.formatSuccess(
              `${toolName} Results`,
              data.data || data,
              executionTime
            );
          } else {
            ResultFormatter.formatError(data.error || 'Tool execution failed');
          }
        } catch (e) {
          // Not JSON, display as text
          ResultFormatter.formatSuccess(
            `${toolName} Results`,
            content.text,
            executionTime
          );
        }
      } else {
        ResultFormatter.formatSuccess(
          `${toolName} Results`,
          content,
          executionTime
        );
      }
    } else {
      // Display raw result
      ResultFormatter.formatSuccess(
        `${toolName} Results`,
        result,
        executionTime
      );
    }
  }

  private async cleanup(): Promise<void> {
    if (this.connection) {
      // MCP connection has isConnected(), API connection does not
      if ('isConnected' in this.connection) {
        if (this.connection.isConnected()) {
          await this.connection.disconnect();
          ResultFormatter.showInfo('Disconnected from server');
        }
      } else {
        // API connection - always try to disconnect
        await this.connection.disconnect();
        ResultFormatter.showInfo('Disconnected from API server');
      }
    }
  }
}

// CLI Program
const program = new Command();

program
  .name('mcp-network-cli')
  .description('Interactive CLI client for MCP Network Testing Server')
  .version('1.0.0')
  .option('-s, --server <path>', 'Path to MCP server executable (MCP mode only)')
  .option('-t, --token <token>', 'JWT authentication token')
  .option('-m, --mode <mode>', 'Connection mode: mcp or api (default: prompt)')
  .option('-u, --api-url <url>', 'API server URL (API mode only, e.g., http://localhost:3001)')
  .action(async (options: CLIOptions) => {
    const cli = new MCPNetworkCLI(options);
    await cli.start();
  });

program.parse();
