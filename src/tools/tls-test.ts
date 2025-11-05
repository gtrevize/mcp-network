/**
 * TLS/SSL certificate validation tool
 */
import * as tls from 'tls';
import { TlsTestOptions, ToolResult } from '../types/index.js';
import { validateHost, validatePort, validateTimeout } from '../middleware/validation.js';
import { logger } from '../logger/index.js';

const DEFAULT_TIMEOUT = 10000;
const MAX_TIMEOUT = 30000;
const DEFAULT_PORT = 443;

export async function testTls(options: TlsTestOptions): Promise<ToolResult> {
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

    const target = hostValidation.sanitized!;
    const port = options.port || DEFAULT_PORT;

    const portValidation = validatePort(port);
    if (!portValidation.valid) {
      return {
        success: false,
        error: `Invalid port: ${portValidation.errors?.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const timeout = validateTimeout(options.timeout, DEFAULT_TIMEOUT, MAX_TIMEOUT);
    const servername = options.servername || target;

    logger.debug({ target, port, servername, timeout }, 'Testing TLS certificate');

    const certInfo = await getTlsCertificate(target, port, servername, timeout);

    return {
      success: true,
      data: certInfo,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error.message, options }, 'TLS test failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

function getTlsCertificate(
  host: string,
  port: number,
  servername: string,
  timeout: number
): Promise<any> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host,
        port,
        servername,
        rejectUnauthorized: false, // We want to see the cert even if invalid
      },
      () => {
        const cert = socket.getPeerCertificate(true);
        const protocol = socket.getProtocol();
        const cipher = socket.getCipher();

        socket.end();

        if (!cert || Object.keys(cert).length === 0) {
          reject(new Error('No certificate received'));
          return;
        }

        const now = new Date();
        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        const isValid = now >= validFrom && now <= validTo;
        const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        resolve({
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysUntilExpiry,
          isValid,
          serialNumber: cert.serialNumber,
          fingerprint: cert.fingerprint,
          fingerprint256: cert.fingerprint256,
          subjectAltNames: cert.subjectaltname?.split(', ') || [],
          protocol,
          cipher: {
            name: cipher?.name,
            version: cipher?.version,
          },
          authorized: socket.authorized,
          authorizationError: socket.authorizationError?.message,
        });
      }
    );

    socket.setTimeout(timeout);

    socket.on('error', (error) => {
      socket.destroy();
      reject(error);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}
