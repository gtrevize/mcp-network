/**
 * IP address detection tool
 * NOTE: This tool provides the client with methods to detect their OWN public IP address.
 * It returns recommended services and instructions rather than detecting server IP.
 */
import { IpAddressResult, ToolResult } from '../types/index.js';
import { logger } from '../logger/index.js';

const IPV4_SERVICES = [
  'https://api.ipify.org?format=json',
  'https://api4.my-ip.io/ip.json',
  'https://ipv4.icanhazip.com',
];

const IPV6_SERVICES = [
  'https://api6.ipify.org?format=json',
  'https://api6.my-ip.io/ip.json',
  'https://ipv6.icanhazip.com',
];

export async function getIpAddress(): Promise<ToolResult<IpAddressResult>> {
  const startTime = Date.now();

  try {
    logger.debug('Providing IP address detection methods for caller');

    // Return detection methods and recommended services for the CLIENT to use
    const result: IpAddressResult = {
      message: 'To detect YOUR public IP address, use one of these methods:',
      methods: {
        curl: 'curl https://api.ipify.org',
        browser: 'Visit https://api.ipify.org or https://ifconfig.me',
        api: 'Make a GET request to https://api.ipify.org?format=json',
      },
      recommendedServices: {
        ipv4: IPV4_SERVICES,
        ipv6: IPV6_SERVICES,
      },
      note: 'These services will return YOUR IP address when YOU make the request from your location.',
    };

    return {
      success: true,
      data: result,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error.message }, 'IP address info failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// Helper functions removed - tool now provides guidance instead of detecting IPs
