/**
 * Startup validation for tool availability and permissions
 */
import { execSync } from 'child_process';
import { logger } from '../logger/index.js';
import { checkToolAvailability, getPlatform } from './platform.js';

export interface ToolAvailabilityStatus {
  available: boolean;
  reason?: string;
  warning?: string;
}

export interface StartupValidationResult {
  availableTools: Set<string>;
  warnings: string[];
  errors: string[];
  toolStatus: Record<string, ToolAvailabilityStatus>;
}

/**
 * Check if tcpdump can be executed by actually trying to run it
 * This is more reliable than checking permissions or capabilities
 */
function canRunTcpdump(): { can: boolean; reason?: string } {
  try {
    const toolCheck = checkToolAvailability('tcpdump');
    if (!toolCheck.available) {
      return { can: false, reason: 'tcpdump not found on system' };
    }

    const platform = getPlatform();
    const tcpdumpPath = toolCheck.command || (platform === 'darwin' ? '/usr/sbin/tcpdump' : 'tcpdump');

    // Try to run tcpdump with a very short capture to test if it works
    // Use -c 1 to capture just 1 packet, -i any to use any interface
    // Timeout after 2 seconds regardless
    try {
      logger.debug({ tcpdumpPath }, 'Testing tcpdump execution');

      // Run tcpdump with minimal capture - just list interfaces to check access
      // This is less intrusive than actually capturing packets
      const testCommand = platform === 'darwin'
        ? `${tcpdumpPath} -D 2>&1` // List interfaces
        : `timeout 1 ${tcpdumpPath} -c 1 -i any 2>&1 || true`; // Capture 1 packet with timeout

      const output = execSync(testCommand, {
        encoding: 'utf-8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Check for permission errors in output
      const outputLower = output.toLowerCase();
      if (outputLower.includes('permission denied') ||
          outputLower.includes('operation not permitted') ||
          outputLower.includes('you don\'t have permission')) {
        const platform = getPlatform();
        return {
          can: false,
          reason: platform === 'darwin'
            ? 'tcpdump requires elevated permissions. Run with: sudo or grant BPF device access'
            : 'tcpdump requires elevated permissions. Run with: sudo or grant CAP_NET_RAW capability'
        };
      }

      // If we got here and no permission errors, tcpdump is accessible
      logger.debug('tcpdump execution test successful');
      return { can: true };

    } catch (error: any) {
      // If timeout or other execution error, check the error message
      const errorMsg = error.message || error.stderr || '';
      const errorLower = errorMsg.toLowerCase();

      if (errorLower.includes('permission denied') ||
          errorLower.includes('operation not permitted')) {
        const platform = getPlatform();
        return {
          can: false,
          reason: platform === 'darwin'
            ? 'tcpdump requires elevated permissions. Run with: sudo or grant BPF device access'
            : 'tcpdump requires elevated permissions. Run with: sudo or grant CAP_NET_RAW capability'
        };
      }

      // Command timeout or other non-permission error - tcpdump might still work
      // This could happen if no packets were captured in time
      logger.debug({ error: errorMsg }, 'tcpdump test had non-permission error, assuming available');
      return { can: true };
    }
  } catch (error) {
    return {
      can: false,
      reason: error instanceof Error ? error.message : 'Unknown error checking tcpdump'
    };
  }
}

/**
 * Validate all network tools at startup
 */
export function validateNetworkTools(): StartupValidationResult {
  const result: StartupValidationResult = {
    availableTools: new Set<string>(),
    warnings: [],
    errors: [],
    toolStatus: {},
  };

  // Always-available tools (built-in Node.js functionality)
  const builtInTools = [
    'test_port',
    'test_api',
    'test_tls',
    'get_ip_address',
    'ip_geolocation',
    'reverse_dns',
    'letsencrypt',
  ];

  builtInTools.forEach(tool => {
    result.availableTools.add(tool);
    result.toolStatus[tool] = { available: true };
  });

  // Check ping
  const pingCheck = checkToolAvailability('ping');
  if (pingCheck.available) {
    result.availableTools.add('ping');
    result.toolStatus.ping = { available: true };
  } else {
    result.toolStatus.ping = {
      available: false,
      reason: `ping not available: ${pingCheck.message}`
    };
    result.errors.push(`CRITICAL: ping tool not available - ${pingCheck.message}`);
  }

  // Check traceroute
  const tracerouteCheck = checkToolAvailability('traceroute');
  if (tracerouteCheck.available) {
    result.availableTools.add('traceroute');
    result.toolStatus.traceroute = { available: true };
  } else {
    result.toolStatus.traceroute = {
      available: false,
      reason: `traceroute not available: ${tracerouteCheck.message}`
    };
    result.warnings.push(`traceroute tool not available - ${tracerouteCheck.message}. ${tracerouteCheck.installHint || ''}`);
  }

  // Check whois
  const whoisCheck = checkToolAvailability('whois');
  if (whoisCheck.available) {
    result.availableTools.add('whois');
    result.toolStatus.whois = { available: true };
  } else {
    result.toolStatus.whois = {
      available: false,
      reason: `whois not available: ${whoisCheck.message}`
    };
    result.warnings.push(`whois tool not available - ${whoisCheck.message}. ${whoisCheck.installHint || ''}`);
  }

  // Check DNS tools (dig preferred, nslookup fallback)
  const digCheck = checkToolAvailability('dig');
  const nslookupCheck = checkToolAvailability('nslookup');
  if (digCheck.available || nslookupCheck.available) {
    result.availableTools.add('dns_lookup');
    result.toolStatus.dns_lookup = {
      available: true,
      warning: !digCheck.available ? 'Using nslookup (dig preferred)' : undefined
    };
    if (!digCheck.available) {
      result.warnings.push('dig not available, using nslookup fallback (less features)');
    }
  } else {
    result.toolStatus.dns_lookup = {
      available: false,
      reason: 'Neither dig nor nslookup available'
    };
    result.warnings.push('DNS lookup tools not available - no dig or nslookup found');
  }

  // Check nmap
  const nmapCheck = checkToolAvailability('nmap');
  if (nmapCheck.available) {
    result.availableTools.add('port_scan');
    result.toolStatus.port_scan = { available: true };
    logger.info('nmap available - port_scan tool enabled');
  } else {
    result.toolStatus.port_scan = {
      available: false,
      reason: `nmap not available: ${nmapCheck.message}`
    };
    result.warnings.push(`port_scan tool disabled - nmap not available. ${nmapCheck.installHint || ''}`);
  }

  // Check tcpdump
  const tcpdumpStatus = canRunTcpdump();
  if (tcpdumpStatus.can) {
    result.availableTools.add('tcpdump');
    result.toolStatus.tcpdump = { available: true };
    logger.info('tcpdump available with sufficient privileges - tcpdump tool enabled');
  } else {
    result.toolStatus.tcpdump = {
      available: false,
      reason: tcpdumpStatus.reason
    };
    result.warnings.push(`tcpdump tool disabled - ${tcpdumpStatus.reason}`);
  }

  // Check iperf/iperf3
  const iperfCheck = checkToolAvailability('iperf');
  if (iperfCheck.available) {
    result.availableTools.add('iperf');
    result.toolStatus.iperf = {
      available: true,
      warning: `Using ${iperfCheck.command}`
    };
    logger.info(`${iperfCheck.command} available - iperf tool enabled`);
  } else {
    result.toolStatus.iperf = {
      available: false,
      reason: `iperf/iperf3 not available: ${iperfCheck.message}`
    };
    result.warnings.push(`iperf tool disabled - iperf/iperf3 not available. ${iperfCheck.installHint || ''}`);
  }

  return result;
}

/**
 * Log startup validation results
 */
export function logStartupValidation(validation: StartupValidationResult): void {
  logger.info(`Tool availability check complete: ${validation.availableTools.size} tools available`);

  if (validation.errors.length > 0) {
    logger.error('ERRORS during startup validation:');
    validation.errors.forEach(error => logger.error(`  ❌ ${error}`));
  }

  if (validation.warnings.length > 0) {
    logger.warn('WARNINGS during startup validation:');
    validation.warnings.forEach(warning => logger.warn(`  ⚠️  ${warning}`));
  }

  logger.info('Available tools:');
  Array.from(validation.availableTools).sort().forEach(tool => {
    const status = validation.toolStatus[tool];
    const statusMsg = status.warning ? ` (${status.warning})` : '';
    logger.info(`  ✓ ${tool}${statusMsg}`);
  });

  const disabledTools = Object.keys(validation.toolStatus).filter(
    tool => !validation.toolStatus[tool].available
  );
  if (disabledTools.length > 0) {
    logger.warn('Disabled tools:');
    disabledTools.forEach(tool => {
      const status = validation.toolStatus[tool];
      logger.warn(`  ✗ ${tool}: ${status.reason}`);
    });
  }
}
