/**
 * Tools API routes
 * Provides REST API access to all network testing tools
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.js';
import { checkPermission } from '../middleware/auth.js';
import { AccessLogger } from '../../logger/index.js';
import { generateRequestId } from '../../utils/helpers.js';
import { PERMISSIONS } from '../../auth/jwt.js';

// Import all tools
import { ping } from '../../tools/ping.js';
import { traceroute } from '../../tools/traceroute.js';
import { testPort } from '../../tools/port-test.js';
import { whois } from '../../tools/whois.js';
import { dnsLookup } from '../../tools/dns.js';
import { testApi } from '../../tools/api-test.js';
import { portScan } from '../../tools/nmap.js';
import { testTls } from '../../tools/tls-test.js';
import { manageLetsEncrypt } from '../../tools/letsencrypt.js';
import { captureTcpdump } from '../../tools/tcpdump.js';
import { runIperf } from '../../tools/iperf.js';
import { getIpAddress } from '../../tools/ip-address.js';
import { getIpGeolocation } from '../../tools/ip-geolocation.js';
import { reverseDnsLookup } from '../../tools/reverse-dns.js';

const router = Router();

/**
 * GET /api/tools
 * List all available tools
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    tools: [
      { name: 'ping', description: 'Test connectivity and measure latency', permission: PERMISSIONS.PING },
      { name: 'traceroute', description: 'Trace network path to destination', permission: PERMISSIONS.TRACEROUTE },
      { name: 'test_port', description: 'Test if a specific port is open', permission: PERMISSIONS.PORT_TEST },
      { name: 'whois', description: 'Domain/IP WHOIS lookup', permission: PERMISSIONS.WHOIS },
      { name: 'dns_lookup', description: 'DNS record queries', permission: PERMISSIONS.DNS },
      { name: 'test_api', description: 'HTTP/HTTPS API endpoint testing', permission: PERMISSIONS.API_TEST },
      { name: 'port_scan', description: 'Port scanning with nmap', permission: PERMISSIONS.PORT_SCAN },
      { name: 'test_tls', description: 'TLS/SSL certificate validation', permission: PERMISSIONS.TLS_TEST },
      { name: 'letsencrypt', description: 'Let\'s Encrypt certificate management', permission: PERMISSIONS.LETSENCRYPT },
      { name: 'tcpdump', description: 'Packet capture', permission: PERMISSIONS.TCPDUMP },
      { name: 'iperf', description: 'Network bandwidth testing', permission: PERMISSIONS.IPERF },
      { name: 'get_ip_address', description: 'Get server public IP address', permission: PERMISSIONS.IP_ADDRESS },
      { name: 'ip_geolocation', description: 'IP geolocation lookup', permission: PERMISSIONS.IP_GEOLOCATION },
      { name: 'reverse_dns', description: 'Reverse DNS (PTR) lookup', permission: PERMISSIONS.REVERSE_DNS },
    ],
    userPermissions: req.auth?.permissions || [],
  });
}));

/**
 * POST /api/tools/ping
 * Execute ping tool
 */
router.post('/ping', checkPermission(PERMISSIONS.PING), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await ping({
      ...req.body,
      context: {
        userId: req.auth!.userId,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
        timestamp: Date.now(),
        requestId,
      },
    });

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'ping',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'ping',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

/**
 * POST /api/tools/traceroute
 * Execute traceroute tool
 */
router.post('/traceroute', checkPermission(PERMISSIONS.TRACEROUTE), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await traceroute({
      ...req.body,
      context: {
        userId: req.auth!.userId,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
        timestamp: Date.now(),
        requestId,
      },
    });

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'traceroute',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'traceroute',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

/**
 * POST /api/tools/test_port
 * Execute port test tool
 */
router.post('/test_port', checkPermission(PERMISSIONS.PORT_TEST), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await testPort({
      ...req.body,
      context: {
        userId: req.auth!.userId,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
        timestamp: Date.now(),
        requestId,
      },
    });

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'test_port',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'test_port',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

/**
 * POST /api/tools/whois
 * Execute whois tool
 */
router.post('/whois', checkPermission(PERMISSIONS.WHOIS), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await whois({
      ...req.body,
      context: {
        userId: req.auth!.userId,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
        timestamp: Date.now(),
        requestId,
      },
    });

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'whois',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'whois',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

/**
 * POST /api/tools/dns_lookup
 * Execute DNS lookup tool
 */
router.post('/dns_lookup', checkPermission(PERMISSIONS.DNS), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await dnsLookup({
      ...req.body,
      context: {
        userId: req.auth!.userId,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
        timestamp: Date.now(),
        requestId,
      },
    });

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'dns_lookup',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'dns_lookup',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

/**
 * POST /api/tools/test_api
 * Execute API test tool
 */
router.post('/test_api', checkPermission(PERMISSIONS.API_TEST), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await testApi({
      ...req.body,
      context: {
        userId: req.auth!.userId,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
        timestamp: Date.now(),
        requestId,
      },
    });

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'test_api',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'test_api',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

/**
 * POST /api/tools/port_scan
 * Execute port scan tool
 */
router.post('/port_scan', checkPermission(PERMISSIONS.PORT_SCAN), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await portScan({
      ...req.body,
      context: {
        userId: req.auth!.userId,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
        timestamp: Date.now(),
        requestId,
      },
    });

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'port_scan',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'port_scan',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

/**
 * POST /api/tools/test_tls
 * Execute TLS test tool
 */
router.post('/test_tls', checkPermission(PERMISSIONS.TLS_TEST), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await testTls({
      ...req.body,
      context: {
        userId: req.auth!.userId,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
        timestamp: Date.now(),
        requestId,
      },
    });

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'test_tls',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'test_tls',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

/**
 * POST /api/tools/letsencrypt
 * Execute Let's Encrypt tool
 */
router.post('/letsencrypt', checkPermission(PERMISSIONS.LETSENCRYPT), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await manageLetsEncrypt({
      ...req.body,
      context: {
        userId: req.auth!.userId,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
        timestamp: Date.now(),
        requestId,
      },
    });

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'letsencrypt',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'letsencrypt',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

/**
 * POST /api/tools/tcpdump
 * Execute tcpdump tool
 */
router.post('/tcpdump', checkPermission(PERMISSIONS.TCPDUMP), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await captureTcpdump({
      ...req.body,
      context: {
        userId: req.auth!.userId,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
        timestamp: Date.now(),
        requestId,
      },
    });

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'tcpdump',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'tcpdump',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

/**
 * POST /api/tools/iperf
 * Execute iperf tool
 */
router.post('/iperf', checkPermission(PERMISSIONS.IPERF), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await runIperf({
      ...req.body,
      context: {
        userId: req.auth!.userId,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
        timestamp: Date.now(),
        requestId,
      },
    });

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'iperf',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'iperf',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

/**
 * POST /api/tools/get_ip_address
 * Execute get IP address tool
 */
router.post('/get_ip_address', checkPermission(PERMISSIONS.IP_ADDRESS), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await getIpAddress();

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'get_ip_address',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'get_ip_address',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

/**
 * POST /api/tools/ip_geolocation
 * Execute IP geolocation tool
 */
router.post('/ip_geolocation', checkPermission(PERMISSIONS.IP_GEOLOCATION), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await getIpGeolocation({
      ...req.body,
      context: {
        userId: req.auth!.userId,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
        timestamp: Date.now(),
        requestId,
      },
    });

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'ip_geolocation',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'ip_geolocation',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

/**
 * POST /api/tools/reverse_dns
 * Execute reverse DNS tool
 */
router.post('/reverse_dns', checkPermission(PERMISSIONS.REVERSE_DNS), asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    const result = await reverseDnsLookup({
      ...req.body,
      context: {
        userId: req.auth!.userId,
        roles: req.auth!.roles,
        permissions: req.auth!.permissions,
        timestamp: Date.now(),
        requestId,
      },
    });

    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'reverse_dns',
      parameters: req.body,
      success: result.success,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
    });

    res.json(result);
  } catch (error: any) {
    AccessLogger.log({
      requestId,
      userId: req.auth!.userId,
      tool: 'reverse_dns',
      parameters: req.body,
      success: false,
      timestamp: new Date().toISOString(),
      action: "execute",
      duration: Date.now() - startTime,
      error: error.message,
    });
    throw error;
  }
}));

export { router as toolsRouter };
