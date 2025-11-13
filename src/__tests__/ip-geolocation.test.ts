/**
 * Tests for IP geolocation tool
 */
import { getIpGeolocation } from '../tools/ip-geolocation.js';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('IP Geolocation Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API-based geolocation', () => {
    it('should successfully retrieve geolocation from ip-api.com', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          country: 'United States',
          countryCode: 'US',
          region: 'CA',
          regionName: 'California',
          city: 'San Francisco',
          zip: '94102',
          lat: 37.7749,
          lon: -122.4194,
          timezone: 'America/Los_Angeles',
          isp: 'Cloudflare',
          org: 'Cloudflare Inc.',
          as: 'AS13335',
          query: '1.1.1.1',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getIpGeolocation({ ip: '1.1.1.1' });

      expect(result.success).toBe(true);
      expect(result.data?.ip).toBe('1.1.1.1');
      expect(result.data?.country).toBe('United States');
      expect(result.data?.city).toBe('San Francisco');
      expect(result.data?.latitude).toBe(37.7749);
      expect(result.data?.longitude).toBe(-122.4194);
      expect(result.data?.source).toBe('ip-api.com');
    });

    it('should fallback to ipapi.co when ip-api.com fails', async () => {
      const mockErrorResponse = new Error('Service unavailable');
      const mockSuccessResponse = {
        data: {
          ip: '8.8.8.8',
          country_name: 'United States',
          country_code: 'US',
          region_code: 'CA',
          region: 'California',
          city: 'Mountain View',
          postal: '94035',
          latitude: 37.4056,
          longitude: -122.0775,
          timezone: 'America/Los_Angeles',
          org: 'Google LLC',
          asn: 'AS15169',
        },
      };

      mockedAxios.get
        .mockRejectedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await getIpGeolocation({ ip: '8.8.8.8' });

      expect(result.success).toBe(true);
      expect(result.data?.ip).toBe('8.8.8.8');
      expect(result.data?.country).toBe('United States');
      expect(result.data?.city).toBe('Mountain View');
      expect(result.data?.source).toBe('ipapi.co');
    });

    it('should fallback to ipwhois.app when other services fail', async () => {
      const mockErrorResponse = new Error('Service unavailable');
      const mockSuccessResponse = {
        data: {
          ip: '9.9.9.9',
          country: 'United States',
          country_code: 'US',
          region: 'California',
          city: 'Berkeley',
          latitude: 37.8715,
          longitude: -122.2730,
          timezone: 'America/Los_Angeles',
          isp: 'Quad9',
          org: 'Quad9 Inc.',
          asn: 'AS19281',
        },
      };

      mockedAxios.get
        .mockRejectedValueOnce(mockErrorResponse)
        .mockRejectedValueOnce(mockErrorResponse)
        .mockResolvedValueOnce(mockSuccessResponse);

      const result = await getIpGeolocation({ ip: '9.9.9.9' });

      expect(result.success).toBe(true);
      expect(result.data?.ip).toBe('9.9.9.9');
      expect(result.data?.country).toBe('United States');
      expect(result.data?.source).toBe('ipwhois.app');
    });
  });

  describe('Input validation', () => {
    it('should handle hostnames that fail geolocation', async () => {
      // Mocked axios returns undefined which causes all services to fail
      const result = await getIpGeolocation({ ip: 'not-an-ip' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('All geolocation services failed');
    });

    it('should reject malicious inputs', async () => {
      const result = await getIpGeolocation({ ip: '1.1.1.1; rm -rf /' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid IP address');
    });

    it('should accept valid IPv4 addresses', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          query: '192.168.1.1',
          country: 'Private Network',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getIpGeolocation({ ip: '192.168.1.1' });

      expect(result.success).toBe(true);
    });

    it('should accept valid IPv6 addresses', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          query: '2001:4860:4860::8888',
          country: 'United States',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getIpGeolocation({ ip: '2001:4860:4860::8888' });

      expect(result.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle all services failing gracefully', async () => {
      const mockError = new Error('Service unavailable');

      // Mock all API services failing
      mockedAxios.get.mockRejectedValue(mockError);

      const result = await getIpGeolocation({ ip: '1.1.1.1' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('All geolocation services failed');
    });

    it('should respect timeout parameter', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          query: '1.1.1.1',
          country: 'United States',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await getIpGeolocation({ ip: '1.1.1.1', timeout: 5000 });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });
  });

  describe('Response structure', () => {
    it('should return proper ToolResult structure', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          query: '1.1.1.1',
          country: 'United States',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getIpGeolocation({ ip: '1.1.1.1' });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('executionTime');
      expect(result).toHaveProperty('timestamp');
      expect(typeof result.executionTime).toBe('number');
      expect(typeof result.timestamp).toBe('string');
    });

    it('should include source information in successful responses', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          query: '1.1.1.1',
          country: 'United States',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await getIpGeolocation({ ip: '1.1.1.1' });

      expect(result.success).toBe(true);
      expect(result.data?.source).toBeDefined();
      expect(typeof result.data?.source).toBe('string');
    });
  });

  describe('Service selection logic', () => {
    it('should skip services with invalid responses', async () => {
      const invalidResponse = {
        data: {
          status: 'fail',
          message: 'Invalid IP',
        },
      };

      const validResponse = {
        data: {
          ip: '1.1.1.1',
          country_name: 'United States',
          country_code: 'US',
          region: 'California',
          city: 'San Francisco',
          latitude: 37.7749,
          longitude: -122.4194,
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(invalidResponse)
        .mockResolvedValueOnce(validResponse);

      const result = await getIpGeolocation({ ip: '1.1.1.1' });

      expect(result.success).toBe(true);
      expect(result.data?.source).toBe('ipapi.co');
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });
});
