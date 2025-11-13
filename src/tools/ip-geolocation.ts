/**
 * IP Geolocation tool
 * Retrieves geolocation information for an IP address using public APIs
 * with fallback mechanisms
 */
import { IpGeolocationOptions, IpGeolocationResult, ToolResult } from '../types/index.js';
import { logger } from '../logger/index.js';
import { validateHost } from '../middleware/validation.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Geolocation API services in order of preference
const GEO_SERVICES = [
  {
    name: 'ip-api.com',
    url: (ip: string) => `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
    parser: (data: any): Partial<IpGeolocationResult> => ({
      ip: data.query,
      country: data.country,
      countryCode: data.countryCode,
      region: data.region,
      regionName: data.regionName,
      city: data.city,
      zip: data.zip,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
      isp: data.isp,
      org: data.org,
      as: data.as,
      status: data.status,
    }),
    isValid: (data: any) => data.status === 'success',
  },
  {
    name: 'ipapi.co',
    url: (ip: string) => `https://ipapi.co/${ip}/json/`,
    parser: (data: any): Partial<IpGeolocationResult> => ({
      ip: data.ip,
      country: data.country_name,
      countryCode: data.country_code,
      region: data.region_code,
      regionName: data.region,
      city: data.city,
      zip: data.postal,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      isp: data.org,
      org: data.org,
      as: data.asn,
    }),
    isValid: (data: any) => !data.error && data.ip,
  },
  {
    name: 'ipwhois.app',
    url: (ip: string) => `https://ipwhois.app/json/${ip}`,
    parser: (data: any): Partial<IpGeolocationResult> => ({
      ip: data.ip,
      country: data.country,
      countryCode: data.country_code,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      isp: data.isp,
      org: data.org,
      as: data.asn,
    }),
    isValid: (data: any) => data.success !== false && data.ip,
  },
];

/**
 * Try to get geolocation from APIs
 */
async function tryGeoApis(ip: string, timeout: number): Promise<IpGeolocationResult | null> {
  for (const service of GEO_SERVICES) {
    try {
      logger.debug({ service: service.name, ip }, 'Trying geolocation service');

      const response = await axios.get(service.url(ip), {
        timeout,
        headers: {
          'User-Agent': 'MCP-Network-Server/1.0',
        },
      });

      if (service.isValid(response.data)) {
        const geoData = service.parser(response.data);
        logger.info({ service: service.name, ip }, 'Successfully retrieved geolocation');

        return {
          ...geoData,
          source: service.name,
        } as IpGeolocationResult;
      }

      logger.debug({ service: service.name, ip }, 'Service returned invalid data');
    } catch (error: any) {
      logger.debug({ service: service.name, error: error.message }, 'Service failed, trying next');
    }
  }

  return null;
}

/**
 * Fallback: Try web scraping from iplocation.net
 */
async function tryWebScraping(ip: string, timeout: number): Promise<IpGeolocationResult | null> {
  try {
    logger.debug({ ip }, 'Attempting web scraping fallback');

    const response = await axios.get(`https://www.iplocation.net/find-ip-address/${ip}`, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const $ = cheerio.load(response.data);
    const result: Partial<IpGeolocationResult> = {
      ip,
      source: 'iplocation.net (web scraping)',
    };

    // Try to extract data from the page
    $('table tr').each((_, row) => {
      const $row = $(row);
      const label = $row.find('td').first().text().trim().toLowerCase();
      const value = $row.find('td').last().text().trim();

      if (label.includes('country') && !label.includes('code')) {
        result.country = value;
      } else if (label.includes('country code')) {
        result.countryCode = value;
      } else if (label.includes('city')) {
        result.city = value;
      } else if (label.includes('region') || label.includes('state')) {
        result.regionName = value;
      } else if (label.includes('latitude')) {
        result.latitude = parseFloat(value);
      } else if (label.includes('longitude')) {
        result.longitude = parseFloat(value);
      } else if (label.includes('isp')) {
        result.isp = value;
      } else if (label.includes('timezone')) {
        result.timezone = value;
      }
    });

    if (result.country || result.city) {
      logger.info({ ip }, 'Successfully scraped geolocation data');
      return result as IpGeolocationResult;
    }

    return null;
  } catch (error: any) {
    logger.debug({ error: error.message }, 'Web scraping failed');
    return null;
  }
}

/**
 * Main geolocation function
 */
export async function getIpGeolocation(
  options: IpGeolocationOptions
): Promise<ToolResult<IpGeolocationResult>> {
  const startTime = Date.now();

  try {
    // Validate IP address
    const validation = validateHost(options.ip);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid IP address: ${validation.errors?.join(', ')}`,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    const ip = validation.sanitized!;
    const timeout = options.timeout || 10000;

    logger.debug({ ip, timeout }, 'Starting IP geolocation lookup');

    // Try API services first
    let result = await tryGeoApis(ip, timeout);

    // Fallback to web scraping if APIs fail
    if (!result) {
      logger.debug('All API services failed, trying web scraping');
      result = await tryWebScraping(ip, timeout);
    }

    if (!result) {
      return {
        success: false,
        error: 'All geolocation services failed. The IP address may be private or the services may be unavailable.',
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
    logger.error({ error: error.message }, 'IP geolocation failed');
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}
