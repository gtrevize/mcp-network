/**
 * Port testing tool implementation
 */
import { connect } from 'net';
import { PortTestOptions, ToolResult } from '../types/index.js';
import { validateHost, validatePort, validateTimeout } from '../middleware/validation.js';
import { logger } from '../logger/index.js';

const DEFAULT_TIMEOUT = 5000;
const MAX_TIMEOUT = 30000;

export async function testPort(options: PortTestOptions): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Validate input
    const hostValidation = validateHost(options.target);
    if (!hostValidation.valid) {
      return {
        success: false,
        error: `Invalid target: ${hostValidation.errors?.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const portValidation = validatePort(options.port);
    if (!portValidation.valid) {
      return {
        success: false,
        error: `Invalid port: ${portValidation.errors?.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const target = hostValidation.sanitized!;
    const port = portValidation.sanitized!;
    const timeout = validateTimeout(options.timeout, DEFAULT_TIMEOUT, MAX_TIMEOUT);
    const protocol = options.protocol || 'tcp';

    if (protocol !== 'tcp') {
      return {
        success: false,
        error: 'Only TCP protocol is currently supported',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    logger.debug({ target, port, timeout, protocol }, 'Testing port');

    const result = await testTcpPort(target, port, timeout);

    return {
      success: true,
      data: {
        target,
        port,
        protocol,
        open: result.open,
        responseTime: result.responseTime,
      },
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error.message, options }, 'Port test failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

function testTcpPort(
  host: string,
  port: number,
  timeout: number
): Promise<{ open: boolean; responseTime: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const socket = connect({ host, port, timeout });

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.on('connect', () => {
      const responseTime = Date.now() - startTime;
      cleanup();
      resolve({ open: true, responseTime });
    });

    socket.on('error', (error: any) => {
      const responseTime = Date.now() - startTime;
      cleanup();

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        resolve({ open: false, responseTime });
      } else {
        reject(error);
      }
    });

    socket.on('timeout', () => {
      const responseTime = Date.now() - startTime;
      cleanup();
      resolve({ open: false, responseTime });
    });
  });
}
