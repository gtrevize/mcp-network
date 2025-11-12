/**
 * Integration tests for network tools with real endpoints
 * These tests make actual network requests and may be slower
 */
import { testApi } from '../tools/api-test.js';
import { portScan } from '../tools/nmap.js';

// Increase timeout for integration tests
jest.setTimeout(60000);

describe('Integration Tests', () => {
  describe('test_api with httpbin.org', () => {
    it('should successfully test GET request to httpbin.org/get', async () => {
      const result = await testApi({
        url: 'https://httpbin.org/get',
        method: 'GET',
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.statusCode).toBe(200);
      expect(result.data.method).toBe('GET');
      expect(result.data.body).toBeDefined();
      expect(result.data.requestTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should successfully test POST request to httpbin.org/post', async () => {
      const testBody = { test: 'data', number: 123 };

      const result = await testApi({
        url: 'https://httpbin.org/post',
        method: 'POST',
        body: testBody,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.statusCode).toBe(200);
      expect(result.data.method).toBe('POST');
      expect(result.data.body).toBeDefined();

      // httpbin echoes back the posted data
      if (result.data.body && typeof result.data.body === 'object') {
        expect(result.data.body.json).toEqual(testBody);
      }
    });

    it('should handle 404 status codes gracefully', async () => {
      const result = await testApi({
        url: 'https://httpbin.org/status/404',
        method: 'GET',
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.data.statusCode).toBe(404);
    });

    it('should validate expected status code', async () => {
      const result = await testApi({
        url: 'https://httpbin.org/status/201',
        method: 'GET',
        expectedStatus: 201,
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.data.statusCode).toBe(201);
      expect(result.data.testResults.passed).toBe(true);
      expect(result.data.testResults.statusMatch).toBe(true);
    });

    it('should detect status code mismatch', async () => {
      const result = await testApi({
        url: 'https://httpbin.org/status/200',
        method: 'GET',
        expectedStatus: 404,
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.data.statusCode).toBe(200);
      expect(result.data.testResults.passed).toBe(false);
      expect(result.data.testResults.statusMatch).toBe(false);
    });
  });

  describe('port_scan with local/network targets', () => {
    it('should scan localhost on common ports', async () => {
      const result = await portScan({
        target: '127.0.0.1',
        ports: '22,80,443,8080',
        scanType: 'tcp',
        timeout: 30000,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.target).toBe('127.0.0.1');
      expect(result.data.openPorts).toBeDefined();
      expect(Array.isArray(result.data.openPorts)).toBe(true);

      // Log results for manual verification
      console.log('Localhost scan results:', {
        target: result.data.target,
        openPorts: result.data.openPorts,
        executionTime: result.executionTime,
      });
    });

    it('should reject hostname and only accept IP addresses', async () => {
      const result = await portScan({
        target: 'localhost',
        ports: '80',
        scanType: 'tcp',
        timeout: 10000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('single IP address');
    });

    it('should reject CIDR ranges', async () => {
      const result = await portScan({
        target: '192.168.1.0/24',
        ports: '80',
        scanType: 'tcp',
        timeout: 10000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle scan with no open ports', async () => {
      // Scan a likely unused high port
      const result = await portScan({
        target: '127.0.0.1',
        ports: '65534',
        scanType: 'tcp',
        timeout: 10000,
      });

      expect(result.success).toBe(true);
      expect(result.data.openPorts).toBeDefined();
      // Port might be closed, that's ok
      expect(Array.isArray(result.data.openPorts)).toBe(true);
    });

    // Skip private network test by default (may not exist or be accessible)
    it.skip('should scan private network IP 192.168.1.1', async () => {
      const result = await portScan({
        target: '192.168.1.1',
        ports: '22,80,443',
        scanType: 'tcp',
        timeout: 30000,
      });

      expect(result.success).toBe(true);
      expect(result.data.target).toBe('192.168.1.1');

      console.log('Private IP scan results:', {
        target: result.data.target,
        openPorts: result.data.openPorts,
      });
    });
  });
});
