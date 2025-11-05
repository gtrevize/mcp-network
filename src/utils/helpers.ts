/**
 * Utility helper functions
 */
import { randomBytes } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../logger/index.js';

export const execAsync = promisify(exec);

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${randomBytes(8).toString('hex')}`;
}

/**
 * Execute a shell command with timeout and error handling
 */
export async function executeCommand(
  command: string,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string }> {
  const controller = new AbortController();
  const { signal } = controller;

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    logger.debug({ command, timeout: timeoutMs }, 'Executing command');

    const result = await execAsync(command, {
      signal,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    clearTimeout(timeoutId);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Command timed out after ${timeoutMs}ms`);
    }

    logger.error({ command, error: error.message }, 'Command execution failed');
    throw error;
  }
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        logger.debug(
          { attempt: attempt + 1, maxRetries, delay },
          'Retrying after failure'
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Check if a command exists in the system
 */
export async function commandExists(command: string): Promise<boolean> {
  try {
    await execAsync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Parse port range string (e.g., "80,443,8000-9000")
 */
export function parsePortRange(portRange: string): number[] {
  const ports: number[] = [];
  const parts = portRange.split(',');

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (isNaN(start) || isNaN(end) || start > end || start < 1 || end > 65535) {
        throw new Error(`Invalid port range: ${part}`);
      }
      for (let port = start; port <= end; port++) {
        ports.push(port);
      }
    } else {
      const port = Number(part);
      if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid port: ${part}`);
      }
      ports.push(port);
    }
  }

  return [...new Set(ports)].sort((a, b) => a - b);
}

/**
 * Throttle function execution
 */
export class Throttler {
  private running = 0;

  constructor(
    private maxConcurrent: number,
    private delayMs: number
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.maxConcurrent) {
      await sleep(100);
    }

    this.running++;

    try {
      const result = await fn();
      await sleep(this.delayMs);
      return result;
    } finally {
      this.running--;
    }
  }
}

/**
 * Compress data using gzip (for pcap files)
 */
export async function compressData(data: Buffer): Promise<Buffer> {
  const { gzip } = await import('zlib');
  const { promisify } = await import('util');
  const gzipAsync = promisify(gzip);
  return await gzipAsync(data);
}
