import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ResultFormatter } from './formatter.js';

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: any;
}

export class MCPConnection {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private tools: MCPTool[] = [];

  async connect(serverPath: string, authToken?: string): Promise<void> {
    const spinner = ResultFormatter.showSpinner('Connecting to MCP server');

    try {
      // Set up environment variables for the server
      const env: Record<string, string> = {};

      // Copy only defined environment variables
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
          env[key] = value;
        }
      }

      // Set authentication token
      if (authToken) {
        env.AUTH_TOKEN = authToken;
      }

      // Create transport using stdio
      this.transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
        env
      });

      // Create client
      this.client = new Client(
        {
          name: 'mcp-network-cli',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      );

      // Connect client to transport
      await this.client.connect(this.transport);

      // Fetch available tools
      const response = await this.client.listTools();
      this.tools = response.tools as MCPTool[];

      spinner.succeed(`Connected to MCP server (${this.tools.length} tools available)`);
    } catch (error) {
      spinner.fail('Failed to connect to MCP server');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  async executeTool(toolName: string, parameters: Record<string, any>): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected to server');
    }

    const spinner = ResultFormatter.showSpinner(`Executing ${toolName}`);

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: parameters
      });

      spinner.succeed(`${toolName} completed`);
      return result;
    } catch (error) {
      spinner.fail(`${toolName} failed`);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}
