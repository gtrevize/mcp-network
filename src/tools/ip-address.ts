/**
 * IP address detection tool
 */
import axios from 'axios';
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
    logger.debug('Detecting IP addresses');

    const [ipv4, ipv6] = await Promise.allSettled([
      detectIpv4(),
      detectIpv6(),
    ]);

    const result: IpAddressResult = {
      ipv4: ipv4.status === 'fulfilled' ? ipv4.value : undefined,
      ipv6: ipv6.status === 'fulfilled' ? ipv6.value : undefined,
    };

    if (!result.ipv4 && !result.ipv6) {
      return {
        success: false,
        error: 'Failed to detect any IP address',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      data: result,
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

async function detectIpv4(): Promise<string> {
  for (const service of IPV4_SERVICES) {
    try {
      const response = await axios.get(service, {
        timeout: 5000,
        headers: { 'User-Agent': 'mcp-network/1.0' },
      });

      const ip = typeof response.data === 'string'
        ? response.data.trim()
        : response.data.ip;

      if (ip && isValidIpv4(ip)) {
        return ip;
      }
    } catch (error) {
      logger.debug({ service, error }, 'IPv4 detection service failed');
      continue;
    }
  }

  throw new Error('Failed to detect IPv4 address');
}

async function detectIpv6(): Promise<string> {
  for (const service of IPV6_SERVICES) {
    try {
      const response = await axios.get(service, {
        timeout: 5000,
        headers: { 'User-Agent': 'mcp-network/1.0' },
      });

      const ip = typeof response.data === 'string'
        ? response.data.trim()
        : response.data.ip;

      if (ip && isValidIpv6(ip)) {
        return ip;
      }
    } catch (error) {
      logger.debug({ service, error }, 'IPv6 detection service failed');
      continue;
    }
  }

  throw new Error('Failed to detect IPv6 address');
}

function isValidIpv4(ip: string): boolean {
  const regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!regex.test(ip)) return false;

  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part);
    return num >= 0 && num <= 255;
  });
}

function isValidIpv6(ip: string): boolean {
  const regex = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/i;
  const regexCompressed = /^([\da-f]{0,4}:){2,7}[\da-f]{0,4}$/i;
  return regex.test(ip) || regexCompressed.test(ip);
}
