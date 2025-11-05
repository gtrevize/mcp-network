/**
 * Centralized logging system with access logging
 */
import pino from 'pino';
import { AccessLog } from '../types/index.js';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

/**
 * Access logger for tracking all tool executions
 */
export class AccessLogger {
  private static logs: AccessLog[] = [];
  private static maxLogs = 10000; // Keep last 10k logs in memory

  static log(entry: AccessLog): void {
    // Add to in-memory store
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to file/stdout
    logger.info(
      {
        type: 'access',
        ...entry,
      },
      'Tool execution'
    );
  }

  static getLogs(filter?: Partial<AccessLog>): AccessLog[] {
    if (!filter) return [...this.logs];

    return this.logs.filter((log) => {
      return Object.entries(filter).every(([key, value]) => {
        return log[key as keyof AccessLog] === value;
      });
    });
  }

  static getLogsByUser(userId: string, limit = 100): AccessLog[] {
    return this.logs
      .filter((log) => log.userId === userId)
      .slice(-limit)
      .reverse();
  }

  static getLogsByTool(tool: string, limit = 100): AccessLog[] {
    return this.logs
      .filter((log) => log.tool === tool)
      .slice(-limit)
      .reverse();
  }

  static clear(): void {
    this.logs = [];
    logger.info('Access logs cleared');
  }
}
