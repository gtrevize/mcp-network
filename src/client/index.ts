#!/usr/bin/env node

import { Command } from 'commander';
import { MCPConnection } from './connection.js';
import { ParameterPrompts } from './prompts.js';
import { ResultFormatter } from './formatter.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CLIOptions {
  server?: string;
  token?: string;
}

class MCPNetworkCLI {
  private connection: MCPConnection;
  private options: CLIOptions;

  constructor(options: CLIOptions) {
    this.connection = new MCPConnection();
    this.options = options;
  }

  async start(): Promise<void> {
    try {
      // Show header
      ResultFormatter.showHeader();

      // Handle server JWT token authentication
      let serverToken = this.options.token || process.env.MCP_AUTH_TOKEN;

      if (!serverToken) {
        ResultFormatter.showWarning('No server JWT token provided');
        serverToken = await ParameterPrompts.getServerToken() || undefined;
      }

      // Handle API key authentication
      let apiKey = process.env.MCP_API_KEY;

      if (!apiKey) {
        ResultFormatter.showWarning('No API key provided');
        apiKey = await ParameterPrompts.getApiKey() || undefined;
      }

      // Determine server path
      const serverPath = this.options.server || path.join(__dirname, '../../dist/index.js');
      ResultFormatter.showInfo(`Server path: ${serverPath}`);

      // Connect to server
      await this.connection.connect(serverPath, serverToken, apiKey);

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

      } catch (error) {
        if (error instanceof Error) {
          ResultFormatter.formatError(`Error: ${error.message}`);
        } else {
          ResultFormatter.formatError(String(error));
        }

        // Ask if user wants to continue after error
        continueSession = await ParameterPrompts.askContinue();
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
    if (this.connection.isConnected()) {
      await this.connection.disconnect();
      ResultFormatter.showInfo('Disconnected from server');
    }
  }
}

// CLI Program
const program = new Command();

program
  .name('mcp-network-cli')
  .description('Interactive CLI client for MCP Network Testing Server')
  .version('1.0.0')
  .option('-s, --server <path>', 'Path to MCP server executable')
  .option('-t, --token <token>', 'JWT authentication token')
  .action(async (options: CLIOptions) => {
    const cli = new MCPNetworkCLI(options);
    await cli.start();
  });

program.parse();
