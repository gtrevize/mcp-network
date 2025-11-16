/**
 * TLS/SSL certificate validation tool
 */
import * as tls from 'tls';
import { TlsTestOptions, ToolResult } from '../types/index.js';
import { validateHost, validatePort, validateTimeout } from '../middleware/validation.js';
import { logger } from '../logger/index.js';
import { validateTlsCertificate } from '../utils/output-validator.js';

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

    // Determine servername for SNI (Server Name Indication)
    // If target is an IP address, don't send SNI (some servers reject it)
    // If servername is explicitly provided, use it
    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(target);
    const servername = options.servername || (isIpAddress ? undefined : target);

    logger.debug({ target, port, servername, timeout, isIpAddress }, 'Testing TLS certificate');

    const certInfo = await getTlsCertificate(target, port, servername, timeout);

    // Validate TLS certificate
    const validation = validateTlsCertificate(certInfo);
    if (!validation.valid) {
      logger.warn({ errors: validation.errors, warnings: validation.warnings, certInfo }, 'TLS certificate validation failed');
      return {
        success: false,
        error: `Invalid TLS certificate: ${validation.errors.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn({ warnings: validation.warnings, certInfo }, 'TLS certificate validation warnings');
    }

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

/**
 * Retrieves TLS certificate information from a remote server.
 *
 * SECURITY NOTE: This function intentionally sets rejectUnauthorized=false
 * because it is a diagnostic tool designed to inspect TLS certificates
 * regardless of their validity. This is the expected behavior for certificate
 * testing tools (similar to openssl s_client, curl -k, or nmap ssl-enum-ciphers).
 * The connection is only used to retrieve certificate metadata and is immediately
 * closed - no sensitive data is transmitted.
 */
function getTlsCertificate(
  host: string,
  port: number,
  servername: string | undefined,
  timeout: number
): Promise<any> {
  return new Promise((resolve, reject) => {
    // JUSTIFICATION: This is a TLS certificate inspection tool that must connect to servers
    // with invalid/expired certificates to analyze them. This is intentional diagnostic behavior,
    // not a security vulnerability. No sensitive data is transmitted over this connection.
    // Similar to openssl s_client, curl -k, or nmap ssl-enum-ciphers diagnostic tools.
    // nosemgrep
    const connectOptions: tls.ConnectionOptions = {
      host,
      port,
      rejectUnauthorized: false, // Required to inspect invalid/expired certificates
    };

    // Only include servername if provided (don't send SNI for IP addresses)
    if (servername) {
      connectOptions.servername = servername;
    }

    const socket = tls.connect(
      connectOptions,
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
