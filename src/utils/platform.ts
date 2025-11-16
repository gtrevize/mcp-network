/**
 * Platform detection and command availability checking
 */
import { execSync } from 'child_process';
import { platform } from 'os';

export type Platform = 'windows' | 'linux' | 'darwin' | 'unknown';

/**
 * Get the current platform
 */
export function getPlatform(): Platform {
  const p = platform();

  if (p === 'win32') return 'windows';
  if (p === 'darwin') return 'darwin';
  if (p === 'linux') return 'linux';

  return 'unknown';
}

/**
 * Check if a command is available on the system
 */
export function isCommandAvailable(command: string): boolean {
  try {
    const currentPlatform = getPlatform();

    // SECURITY: Command parameter is only used for checking system binary existence.
    // This function is called with hardcoded command names only (ping, nmap, tcpdump, etc).
    if (currentPlatform === 'windows') {
      // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
      execSync(`where ${command}`, { stdio: 'ignore' });
    } else {
      // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
      execSync(`which ${command}`, { stdio: 'ignore' });
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Check if command requires sudo/elevated privileges
 */
export function requiresSudo(command: string): boolean {
  const currentPlatform = getPlatform();

  // Commands that typically require elevated privileges on Unix-like systems
  const sudoCommands = ['tcpdump', 'nmap'];

  if (currentPlatform === 'windows') {
    // Windows uses Administrator privileges differently
    return false;
  }

  return sudoCommands.includes(command);
}

/**
 * Platform-specific ping command builder
 */
export function buildPingCommand(host: string, count: number, timeout: number): string {
  const currentPlatform = getPlatform();

  switch (currentPlatform) {
    case 'windows':
      // Windows: ping -n <count> -w <timeout_ms> <host>
      return `ping -n ${count} -w ${timeout} ${host}`;

    case 'darwin':
      // macOS: ping -c <count> -t <timeout_sec> <host>
      const timeoutSec = Math.ceil(timeout / 1000);
      return `ping -c ${count} -t ${timeoutSec} ${host}`;

    case 'linux':
      // Linux: ping -c <count> -W <timeout_sec> <host>
      const timeoutSecLinux = Math.ceil(timeout / 1000);
      return `ping -c ${count} -W ${timeoutSecLinux} ${host}`;

    default:
      throw new Error(`Unsupported platform: ${currentPlatform}`);
  }
}

/**
 * Platform-specific traceroute command builder
 * Note: timeout parameter is the total execution timeout, but traceroute's -w flag
 * is per-hop timeout. We use a reasonable per-hop timeout (5 seconds) regardless
 * of the total timeout to prevent excessive waiting.
 */
export function buildTracerouteCommand(host: string, maxHops: number, _timeout: number): string {
  const currentPlatform = getPlatform();
  // Use 5 seconds per hop timeout for reasonable response times
  const perHopTimeout = 5;

  switch (currentPlatform) {
    case 'windows':
      // Windows: tracert -h <max_hops> -w <timeout_ms> <host>
      // Windows -w is in milliseconds
      return `tracert -h ${maxHops} -w ${perHopTimeout * 1000} ${host}`;

    case 'darwin':
      // macOS: traceroute -m <max_hops> -w <timeout_sec> <host>
      return `traceroute -m ${maxHops} -w ${perHopTimeout} ${host}`;

    case 'linux':
      // Linux: traceroute -m <max_hops> -w <timeout_sec> <host>
      return `traceroute -m ${maxHops} -w ${perHopTimeout} ${host}`;

    default:
      throw new Error(`Unsupported platform: ${currentPlatform}`);
  }
}

/**
 * Platform-specific DNS command builder
 */
export function buildDnsCommand(domain: string, recordType: string): string {
  const currentPlatform = getPlatform();

  switch (currentPlatform) {
    case 'windows':
      // Windows: nslookup -type=<type> <domain>
      return `nslookup -type=${recordType} ${domain}`;

    case 'darwin':
    case 'linux':
      // Unix-like: dig <domain> <type>
      if (isCommandAvailable('dig')) {
        return `dig ${domain} ${recordType}`;
      } else {
        // Fallback to nslookup if dig not available
        return `nslookup -type=${recordType} ${domain}`;
      }

    default:
      throw new Error(`Unsupported platform: ${currentPlatform}`);
  }
}

/**
 * Get platform-specific nmap command name
 */
export function getNmapCommand(): string {
  const currentPlatform = getPlatform();

  if (currentPlatform === 'windows') {
    // Check both nmap.exe and nmap
    if (isCommandAvailable('nmap.exe')) {
      return 'nmap.exe';
    }
  }

  return 'nmap';
}

/**
 * Get platform-specific tcpdump command name
 */
export function getTcpdumpCommand(): string {
  const currentPlatform = getPlatform();

  if (currentPlatform === 'windows') {
    // Windows uses WinDump
    if (isCommandAvailable('windump')) {
      return 'windump';
    }
    if (isCommandAvailable('tcpdump')) {
      return 'tcpdump';
    }
    throw new Error('tcpdump/windump not available on Windows. Install WinPcap and WinDump.');
  }

  return 'tcpdump';
}

/**
 * Tool availability check with helpful error messages
 */
export interface ToolCheck {
  available: boolean;
  command: string;
  message?: string;
  installHint?: string;
}

export function checkToolAvailability(tool: string): ToolCheck {
  const currentPlatform = getPlatform();

  switch (tool) {
    case 'ping':
      // Ping is built-in on all platforms
      return {
        available: true,
        command: 'ping'
      };

    case 'traceroute':
      const traceCommand = currentPlatform === 'windows' ? 'tracert' : 'traceroute';
      const traceAvailable = isCommandAvailable(traceCommand);

      return {
        available: traceAvailable,
        command: traceCommand,
        message: traceAvailable ? undefined : `${traceCommand} command not found`,
        installHint: traceAvailable ? undefined :
          currentPlatform === 'linux' ? 'Install: apt-get install traceroute or yum install traceroute' :
          currentPlatform === 'darwin' ? 'traceroute should be pre-installed on macOS' :
          'tracert should be available on Windows'
      };

    case 'nmap':
      const nmapCmd = getNmapCommand();
      const nmapAvailable = isCommandAvailable(nmapCmd);

      return {
        available: nmapAvailable,
        command: nmapCmd,
        message: nmapAvailable ? undefined : 'nmap command not found',
        installHint: nmapAvailable ? undefined :
          currentPlatform === 'linux' ? 'Install: apt-get install nmap or yum install nmap' :
          currentPlatform === 'darwin' ? 'Install: brew install nmap' :
          'Download from: https://nmap.org/download.html'
      };

    case 'tcpdump':
      try {
        const tcpdumpCmd = getTcpdumpCommand();
        const tcpdumpAvailable = isCommandAvailable(tcpdumpCmd);

        return {
          available: tcpdumpAvailable,
          command: tcpdumpCmd,
          message: tcpdumpAvailable ? undefined : `${tcpdumpCmd} command not found`,
          installHint: tcpdumpAvailable ? undefined :
            currentPlatform === 'linux' ? 'Install: apt-get install tcpdump or yum install tcpdump' :
            currentPlatform === 'darwin' ? 'tcpdump should be pre-installed on macOS' :
            'Install WinPcap and WinDump from: https://www.winpcap.org/'
        };
      } catch (error) {
        return {
          available: false,
          command: 'tcpdump',
          message: error instanceof Error ? error.message : 'tcpdump not available',
          installHint: 'Install WinPcap and WinDump from: https://www.winpcap.org/'
        };
      }

    case 'iperf':
    case 'iperf3':
      const iperfCmd = isCommandAvailable('iperf3') ? 'iperf3' : 'iperf';
      const iperfAvailable = isCommandAvailable(iperfCmd);

      return {
        available: iperfAvailable,
        command: iperfCmd,
        message: iperfAvailable ? undefined : 'iperf/iperf3 command not found',
        installHint: iperfAvailable ? undefined :
          currentPlatform === 'linux' ? 'Install: apt-get install iperf3 or yum install iperf3' :
          currentPlatform === 'darwin' ? 'Install: brew install iperf3' :
          'Download from: https://iperf.fr/iperf-download.php'
      };

    case 'dig':
      const digAvailable = isCommandAvailable('dig');

      return {
        available: digAvailable,
        command: 'dig',
        message: digAvailable ? undefined : 'dig command not found (using nslookup fallback)',
        installHint: digAvailable ? undefined :
          currentPlatform === 'linux' ? 'Install: apt-get install dnsutils or yum install bind-utils' :
          currentPlatform === 'darwin' ? 'dig should be pre-installed on macOS' :
          'dig not available on Windows (using nslookup)'
      };

    case 'nslookup':
      // nslookup is available on all platforms
      return {
        available: true,
        command: 'nslookup'
      };

    case 'whois':
      const whoisAvailable = isCommandAvailable('whois');

      return {
        available: whoisAvailable,
        command: 'whois',
        message: whoisAvailable ? undefined : 'whois command not found',
        installHint: whoisAvailable ? undefined :
          currentPlatform === 'linux' ? 'Install: apt-get install whois or yum install whois' :
          currentPlatform === 'darwin' ? 'whois should be pre-installed on macOS' :
          'Download from: https://docs.microsoft.com/en-us/sysinternals/downloads/whois'
      };

    case 'curl':
      const curlAvailable = isCommandAvailable('curl');

      return {
        available: curlAvailable,
        command: 'curl',
        message: curlAvailable ? undefined : 'curl command not found',
        installHint: curlAvailable ? undefined :
          currentPlatform === 'linux' ? 'Install: apt-get install curl or yum install curl' :
          currentPlatform === 'darwin' ? 'curl should be pre-installed on macOS' :
          'curl should be available on Windows 10+ or download from: https://curl.se/windows/'
      };

    case 'openssl':
      const opensslAvailable = isCommandAvailable('openssl');

      return {
        available: opensslAvailable,
        command: 'openssl',
        message: opensslAvailable ? undefined : 'openssl command not found',
        installHint: opensslAvailable ? undefined :
          currentPlatform === 'linux' ? 'Install: apt-get install openssl or yum install openssl' :
          currentPlatform === 'darwin' ? 'openssl should be pre-installed on macOS' :
          'Download from: https://slproweb.com/products/Win32OpenSSL.html'
      };

    default:
      return {
        available: isCommandAvailable(tool),
        command: tool,
        message: `Unknown tool: ${tool}`
      };
  }
}

/**
 * Get platform information for debugging
 */
export function getPlatformInfo(): {
  platform: Platform;
  arch: string;
  release: string;
} {
  return {
    platform: getPlatform(),
    arch: process.arch,
    release: process.platform
  };
}
