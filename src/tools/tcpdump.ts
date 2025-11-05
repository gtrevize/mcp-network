/**
 * Tcpdump capture tool with size/time limits
 */
import { spawn } from 'child_process';
import { unlink } from 'fs/promises';
import { randomBytes } from 'crypto';
import { TcpdumpOptions, ToolResult } from '../types/index.js';
import { logger } from '../logger/index.js';
import { commandExists, compressData } from '../utils/helpers.js';
import { readFile } from 'fs/promises';

const DEFAULT_DURATION = 10; // seconds
const MAX_DURATION = 300; // 5 minutes
const DEFAULT_MAX_SIZE = 10; // MB
const MAX_MAX_SIZE = 100; // MB

export async function captureTcpdump(options: TcpdumpOptions): Promise<ToolResult> {
  const startTime = Date.now();
  const captureFile = `/tmp/tcpdump_${Date.now()}_${randomBytes(4).toString('hex')}.pcap`;

  try {
    // Check if tcpdump is installed
    if (!(await commandExists('tcpdump'))) {
      return {
        success: false,
        error: 'tcpdump is not installed on this system',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const duration = Math.min(options.duration || DEFAULT_DURATION, MAX_DURATION);
    const maxSize = Math.min(options.maxSize || DEFAULT_MAX_SIZE, MAX_MAX_SIZE);
    const outputFormat = options.output || 'base64';
    const filter = options.filter || '';

    logger.debug(
      { duration, maxSize, filter, captureFile },
      'Starting packet capture'
    );

    await capturePackets(
      captureFile,
      duration,
      maxSize,
      filter,
      options.interface
    );

    // Read the capture file
    const pcapData = await readFile(captureFile);

    // Compress the data
    const compressed = await compressData(pcapData);

    // Clean up capture file
    await unlink(captureFile);

    let result: any = {
      duration,
      maxSize,
      filter,
      captureSize: pcapData.length,
      compressedSize: compressed.length,
    };

    if (outputFormat === 'base64') {
      result.data = compressed.toString('base64');
    } else if (outputFormat === 'url') {
      // In production, you would upload to S3 or similar and return URL
      // For now, we'll still return base64 with a note
      result.data = compressed.toString('base64');
      result.note = 'URL mode requires cloud storage configuration';
    }

    return {
      success: true,
      data: result,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    // Clean up capture file if it exists
    try {
      await unlink(captureFile);
    } catch {}

    logger.error({ error: error.message, options }, 'Tcpdump capture failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

function capturePackets(
  outputFile: string,
  duration: number,
  maxSize: number,
  filter: string,
  iface?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-w',
      outputFile,
      '-G',
      duration.toString(), // Rotate after N seconds (acts as duration)
      '-W',
      '1', // Keep only 1 file
      '-C',
      maxSize.toString(), // Max file size in MB
    ];

    if (iface) {
      args.push('-i', iface);
    }

    if (filter) {
      args.push(...filter.split(' '));
    }

    logger.info({ args }, 'Starting tcpdump');

    const proc = spawn('tcpdump', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let errorOutput = '';

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
      // tcpdump writes status to stderr, which is normal
      logger.debug(data.toString().trim(), 'tcpdump stderr');
    });

    // Set timeout slightly longer than capture duration
    const timeoutId = setTimeout(() => {
      proc.kill('SIGINT'); // Graceful shutdown
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      }, 2000);
    }, duration * 1000 + 2000);

    proc.on('close', (code) => {
      clearTimeout(timeoutId);

      // Code 0 or 143 (SIGTERM) are success
      if (code === 0 || code === 143 || code === null) {
        resolve();
      } else {
        reject(new Error(`tcpdump failed with code ${code}: ${errorOutput}`));
      }
    });

    proc.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}
