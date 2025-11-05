/**
 * iPerf3 client/server tool
 */
import { spawn } from 'child_process';
import { IperfOptions, ToolResult } from '../types/index.js';
import { validateHost, validatePort } from '../middleware/validation.js';
import { logger } from '../logger/index.js';
import { commandExists } from '../utils/helpers.js';

const DEFAULT_PORT = 5201;
const DEFAULT_DURATION = 10;
const MAX_DURATION = 300;

export async function runIperf(options: IperfOptions): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Check if iperf3 is installed
    if (!(await commandExists('iperf3'))) {
      return {
        success: false,
        error: 'iperf3 is not installed on this system',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const mode = options.mode || 'client';
    const port = options.port || DEFAULT_PORT;
    const duration = Math.min(options.duration || DEFAULT_DURATION, MAX_DURATION);
    const protocol = options.protocol || 'tcp';

    // Validate port
    const portValidation = validatePort(port);
    if (!portValidation.valid) {
      return {
        success: false,
        error: `Invalid port: ${portValidation.errors?.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    logger.debug({ mode, port, duration, protocol }, 'Running iPerf3');

    let result;
    switch (mode) {
      case 'server':
        result = await runIperfServer(port, duration * 1000 + 10000);
        break;
      case 'client':
        if (!options.serverHost) {
          return {
            success: false,
            error: 'serverHost is required for client mode',
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          };
        }
        const hostValidation = validateHost(options.serverHost);
        if (!hostValidation.valid) {
          return {
            success: false,
            error: `Invalid server host: ${hostValidation.errors?.join(', ')}`,
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          };
        }
        result = await runIperfClient(
          hostValidation.sanitized!,
          port,
          duration,
          protocol,
          options.bandwidth,
          options.parallel
        );
        break;
      case 'both':
        return {
          success: false,
          error: 'Both mode not yet implemented - run server and client separately',
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      default:
        return {
          success: false,
          error: `Invalid mode: ${mode}`,
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
    logger.error({ error: error.message, options }, 'iPerf3 failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

function runIperfServer(port: number, timeout: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const args = ['-s', '-p', port.toString(), '-1', '-J']; // -1 = exit after one client, -J = JSON output

    logger.info({ args }, 'Starting iPerf3 server');

    const proc = spawn('iperf3', args);
    let output = '';
    let errorOutput = '';

    const timeoutId = setTimeout(() => {
      proc.kill();
      reject(new Error('iPerf3 server timeout'));
    }, timeout);

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);

      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve({
            mode: 'server',
            port,
            result,
            rawOutput: output,
          });
        } catch {
          // If JSON parsing fails, return raw output
          resolve({
            mode: 'server',
            port,
            rawOutput: output,
          });
        }
      } else {
        reject(new Error(`iPerf3 server failed: ${errorOutput || 'Unknown error'}`));
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}

function runIperfClient(
  host: string,
  port: number,
  duration: number,
  protocol: string,
  bandwidth?: string,
  parallel?: number
): Promise<any> {
  return new Promise((resolve, reject) => {
    const args = [
      '-c',
      host,
      '-p',
      port.toString(),
      '-t',
      duration.toString(),
      '-J', // JSON output
    ];

    if (protocol === 'udp') {
      args.push('-u');
      if (bandwidth) {
        args.push('-b', bandwidth);
      }
    }

    if (parallel && parallel > 1) {
      args.push('-P', parallel.toString());
    }

    logger.info({ args }, 'Starting iPerf3 client');

    const proc = spawn('iperf3', args);
    let output = '';
    let errorOutput = '';

    const timeout = duration * 1000 + 30000; // Add 30s buffer
    const timeoutId = setTimeout(() => {
      proc.kill();
      reject(new Error('iPerf3 client timeout'));
    }, timeout);

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);

      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve({
            mode: 'client',
            serverHost: host,
            port,
            duration,
            protocol,
            result,
          });
        } catch {
          resolve({
            mode: 'client',
            serverHost: host,
            port,
            duration,
            protocol,
            rawOutput: output,
          });
        }
      } else {
        reject(new Error(`iPerf3 client failed: ${errorOutput || 'Unknown error'}`));
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}
