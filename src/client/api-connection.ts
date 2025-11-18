/**
 * REST API Connection for MCP Network Testing Client
 * Provides HTTP/HTTPS connection to the REST API server
 */

import axios, { AxiosInstance } from 'axios';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export class APIConnection {
  private client: AxiosInstance | null = null;
  private apiUrl: string = '';
  private authToken: string = '';
  private tools: Tool[] = [];

  /**
   * Connect to the REST API server
   */
  async connect(apiUrl: string, authToken?: string): Promise<void> {
    this.apiUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
    this.authToken = authToken || '';

    // Create axios instance with auth header
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // Fetch available tools
    try {
      const response = await this.client.get('/api/tools');
      this.tools = response.data.tools || [];
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please check your AUTH_TOKEN.');
      }
      throw new Error(`Failed to connect to API server: ${error.message}`);
    }
  }

  /**
   * Get list of available tools
   */
  getTools(): Tool[] {
    return this.tools;
  }

  /**
   * Execute a tool via REST API
   */
  async executeTool(name: string, parameters: Record<string, any>): Promise<any> {
    if (!this.client) {
      throw new Error('Not connected to API server');
    }

    try {
      const response = await this.client.post(`/api/tools/${name}`, parameters);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        // Server responded with error
        const errorData = error.response.data;
        throw new Error(errorData.error || errorData.message || 'Tool execution failed');
      } else if (error.request) {
        // No response received
        throw new Error('No response from API server. Is the server running?');
      } else {
        // Error setting up request
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  /**
   * Disconnect from API server
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.tools = [];
  }
}
