/**
 * Let's Encrypt certificate management
 * This is a complex tool that requires cloud provider integration
 * For MVP, we'll provide the structure with DNS challenge support
 */
import acme from 'acme-client';
import { LetsEncryptOptions, ToolResult } from '../types/index.js';
import { validateDomain, validateEmail } from '../middleware/validation.js';
import { logger } from '../logger/index.js';

const LETSENCRYPT_PRODUCTION = 'https://acme-v02.api.letsencrypt.org/directory';
const LETSENCRYPT_STAGING = 'https://acme-staging-v02.api.letsencrypt.org/directory';

export async function manageLetsEncrypt(options: LetsEncryptOptions): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Validate inputs
    const domainValidation = validateDomain(options.domain);
    if (!domainValidation.valid) {
      return {
        success: false,
        error: `Invalid domain: ${domainValidation.errors?.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const emailValidation = validateEmail(options.email);
    if (!emailValidation.valid) {
      return {
        success: false,
        error: `Invalid email: ${emailValidation.errors?.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const domain = domainValidation.sanitized!;
    const email = emailValidation.sanitized!;
    const challenge = options.challenge || 'dns';

    logger.info({ domain, email, challenge, action: options.action }, 'Managing Let\'s Encrypt certificate');

    // Use staging for testing
    const directoryUrl = process.env.LETSENCRYPT_PRODUCTION === 'true'
      ? LETSENCRYPT_PRODUCTION
      : LETSENCRYPT_STAGING;

    switch (options.action) {
      case 'create':
      case 'renew':
        return await createOrRenewCertificate(
          domain,
          email,
          challenge,
          directoryUrl,
          options.cloudProvider,
          options.cloudCredentials
        );
      case 'revoke':
        return {
          success: false,
          error: 'Certificate revocation not yet implemented',
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      default:
        return {
          success: false,
          error: `Invalid action: ${options.action}`,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
    }
  } catch (error: any) {
    logger.error({ error: error.message, options }, 'Let\'s Encrypt operation failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

async function createOrRenewCertificate(
  domain: string,
  _email: string,
  challenge: string,
  directoryUrl: string,
  _cloudProvider?: string,
  _cloudCredentials?: Record<string, string>
): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Create ACME client
    const accountKey = await acme.forge.createPrivateKey();

    const client = new acme.Client({
      directoryUrl,
      accountKey,
    });

    // Create CSR
    const [key, csr] = await acme.forge.createCsr({
      commonName: domain,
    });

    // Create certificate order
    const order = await client.createOrder({
      identifiers: [
        { type: 'dns', value: domain },
      ],
    });

    // Get authorizations
    const authorizations = await client.getAuthorizations(order);

    for (const authz of authorizations) {
      // Find the challenge type we want
      const challengeType = challenge === 'dns' ? 'dns-01' : 'http-01';
      const challengeObj = authz.challenges.find((c: any) => c.type === challengeType);

      if (!challengeObj) {
        throw new Error(`${challengeType} challenge not available`);
      }

      if (challenge === 'dns') {
        // DNS challenge
        const keyAuthorization = await client.getChallengeKeyAuthorization(challengeObj);
        const dnsRecord = `_acme-challenge.${domain}`;
        const dnsValue = keyAuthorization;

        logger.info(
          { dnsRecord, dnsValue },
          'DNS challenge - manual intervention required'
        );

        return {
          success: false,
          error: 'DNS challenge requires manual DNS record creation or cloud provider integration',
          data: {
            domain,
            challengeType: 'dns-01',
            dnsRecord,
            dnsValue,
            instructions: [
              `Create a TXT record at ${dnsRecord}`,
              `Set the value to: ${dnsValue}`,
              'Wait for DNS propagation (can take up to 48 hours)',
              'Re-run this command to complete verification',
            ],
          },
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      } else {
        // HTTP challenge
        return {
          success: false,
          error: 'HTTP challenge requires web server configuration and is not yet fully implemented',
          data: {
            domain,
            challengeType: 'http-01',
            instructions: [
              'HTTP challenge would require serving a file at:',
              `http://${domain}/.well-known/acme-challenge/${challengeObj.token}`,
              'This requires web server integration',
            ],
          },
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // If we get here, challenges are validated
    // Finalize order
    await client.finalizeOrder(order, csr);
    const certificate = await client.getCertificate(order);

    return {
      success: true,
      data: {
        domain,
        certificate: Buffer.from(certificate).toString('base64'),
        privateKey: Buffer.from(key).toString('base64'),
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      },
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    throw error;
  }
}
