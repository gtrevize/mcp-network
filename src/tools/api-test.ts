/**
 * API testing tool (Postman-style)
 */
import axios, { AxiosRequestConfig } from 'axios';
import { ApiTestOptions, ToolResult } from '../types/index.js';
import { validateUrl, validateTimeout } from '../middleware/validation.js';
import { logger } from '../logger/index.js';
import { validateApiTestResponse } from '../utils/output-validator.js';

const DEFAULT_TIMEOUT = 30000;
const MAX_TIMEOUT = 120000;

export async function testApi(options: ApiTestOptions): Promise<ToolResult> {
  const startTime = Date.now();

  try {
    // Validate URL
    const urlValidation = validateUrl(options.url);
    if (!urlValidation.valid) {
      return {
        success: false,
        error: `Invalid URL: ${urlValidation.errors?.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const url = urlValidation.sanitized!;
    const method = options.method || 'GET';
    const timeout = validateTimeout(options.timeout, DEFAULT_TIMEOUT, MAX_TIMEOUT);

    logger.debug({ url, method, timeout }, 'Testing API endpoint');

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: options.headers || {},
      timeout,
      validateStatus: () => true, // Accept any status code
      maxRedirects: 5,
    };

    if (options.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.data = options.body;
    }

    // Perform request
    const requestStart = Date.now();
    const response = await axios(config);
    const requestTime = Date.now() - requestStart;

    // Validate API response structure
    const validation = validateApiTestResponse({
      status: response.status,
      responseTime: requestTime,
      headers: response.headers,
      body: response.data,
    });

    if (!validation.valid) {
      logger.warn({ errors: validation.errors, warnings: validation.warnings }, 'API response validation failed');
      return {
        success: false,
        error: `Invalid API response: ${validation.errors.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn({ warnings: validation.warnings }, 'API response validation warnings');
    }

    // Check expected status
    const statusMatch = options.expectedStatus
      ? response.status === options.expectedStatus
      : true;

    // Check expected body (simple equality check)
    let bodyMatch = true;
    if (options.expectedBody !== undefined) {
      bodyMatch = JSON.stringify(response.data) === JSON.stringify(options.expectedBody);
    }

    const testPassed = statusMatch && bodyMatch;

    return {
      success: true,
      data: {
        url,
        method,
        statusCode: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.data,
        requestTime,
        testResults: {
          passed: testPassed,
          statusMatch,
          bodyMatch,
          expectedStatus: options.expectedStatus,
          expectedBody: options.expectedBody,
        },
      },
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error({ error: error.message, options }, 'API test failed');

    // Return error details
    return {
      success: false,
      error: error.message,
      data: {
        url: options.url,
        method: options.method,
        errorDetails: {
          code: error.code,
          message: error.message,
          response: error.response
            ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data,
              }
            : undefined,
        },
      },
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}
