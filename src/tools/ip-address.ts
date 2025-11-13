/**
 * IP address detection tool
 * Detects the server's public IP address using DNS queries (primary) and API calls (fallback)
 */
import { IpAddressResult, ToolResult } from '../types/index.js';
import { logger } from '../logger/index.js';
import { executeCommand } from '../utils/helpers.js';
import axios from 'axios';

// DNS resolvers for IP detection (fastest method)
const DNS_RESOLVERS = [
  { resolver: 'resolver1.opendns.com', query: 'myip.opendns.com', type: 'A' },
  { resolver: 'resolver2.opendns.com', query: 'myip.opendns.com', type: 'A' },
  { resolver: 'ns1.google.com', query: 'o-o.myaddr.l.google.com', type: 'TXT' },
];

// API services for fallback (slower but more reliable)
const API_SERVICES = [
  { url: 'https://api.ipify.org?format=json', parser: (data: any) => data.ip },
  { url: 'https://api4.my-ip.io/ip.json', parser: (data: any) => data.ip },
  { url: 'https://icanhazip.com', parser: (data: any) => data.trim() },
];

/**
 * Try to get IP using DNS queries
 */
async function tryDnsDetection(): Promise<{ ipv4?: string; method: string } | null> {
  for (const resolver of DNS_RESOLVERS) {
    try {
      logger.debug({ resolver: resolver.resolver, query: resolver.query }, 'Trying DNS resolver');

      // Use dig command for DNS query
      const command = `dig +short ${resolver.query} @${resolver.resolver} ${resolver.type}`;
      const { stdout } = await executeCommand(command, 5000);

      let ip = stdout.trim();

      // For TXT records, remove quotes
      if (resolver.type === 'TXT') {
        ip = ip.replace(/"/g, '');
      }

      // Validate it's a valid IPv4 address
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
        logger.info({ ip, method: `DNS:${resolver.resolver}` }, 'Successfully detected IP via DNS');
        return {
          ipv4: ip,
          method: `DNS (${resolver.resolver})`,
        };
      }

      logger.debug({ resolver: resolver.resolver, output: ip }, 'DNS query returned invalid IP');
    } catch (error: any) {
      logger.debug({ resolver: resolver.resolver, error: error.message }, 'DNS resolver failed');
    }
  }

  return null;
}

/**
 * Try to get IP using API services
 */
async function tryApiDetection(): Promise<{ ipv4?: string; method: string } | null> {
  for (const service of API_SERVICES) {
    try {
      logger.debug({ url: service.url }, 'Trying API service');

      const response = await axios.get(service.url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'MCP-Network-Server/1.0',
        },
      });

      const ip = service.parser(response.data);

      // Validate it's a valid IPv4 address
      if (ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
        logger.info({ ip, method: `API:${service.url}` }, 'Successfully detected IP via API');
        return {
          ipv4: ip,
          method: `API (${new URL(service.url).hostname})`,
        };
      }

      logger.debug({ service: service.url, ip }, 'API returned invalid IP');
    } catch (error: any) {
      logger.debug({ service: service.url, error: error.message }, 'API service failed');
    }
  }

  return null;
}

/**
 * Main IP address detection function
 */
export async function getIpAddress(): Promise<ToolResult<IpAddressResult>> {
  const startTime = Date.now();

  try {
    logger.debug('Starting IP address detection');

    // Try DNS first (faster)
    let result = await tryDnsDetection();

    // Fallback to API if DNS fails
    if (!result) {
      logger.debug('All DNS resolvers failed, trying API services');
      result = await tryApiDetection();
    }

    if (!result) {
      return {
        success: false,
        error: 'All IP detection methods failed. DNS resolvers and API services unavailable.',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      data: result as IpAddressResult,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error.message }, 'IP address detection failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}
