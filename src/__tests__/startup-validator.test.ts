/**
 * Tests for startup validation and tool availability checking
 */
import { execSync } from 'child_process';
import { validateNetworkTools } from '../utils/startup-validator.js';
import * as platform from '../utils/platform.js';

// Mock child_process execSync
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

// Mock platform utilities
jest.mock('../utils/platform.js', () => ({
  getPlatform: jest.fn(),
  checkToolAvailability: jest.fn(),
}));

const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockedGetPlatform = platform.getPlatform as jest.MockedFunction<typeof platform.getPlatform>;
const mockedCheckToolAvailability = platform.checkToolAvailability as jest.MockedFunction<typeof platform.checkToolAvailability>;

describe('startup-validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateNetworkTools', () => {
    it('should detect available built-in tools', () => {
      // Mock all platform-specific tools as unavailable
      mockedGetPlatform.mockReturnValue('linux');
      mockedCheckToolAvailability.mockReturnValue({
        available: false,
        command: 'mock',
        message: 'not available'
      });

      const result = validateNetworkTools();

      // Built-in tools should always be available
      expect(result.availableTools.has('test_port')).toBe(true);
      expect(result.availableTools.has('test_api')).toBe(true);
      expect(result.availableTools.has('test_tls')).toBe(true);
      expect(result.availableTools.has('get_ip_address')).toBe(true);
      expect(result.availableTools.has('letsencrypt')).toBe(true);
    });

    it('should detect ping availability', () => {
      mockedGetPlatform.mockReturnValue('linux');
      mockedCheckToolAvailability.mockImplementation((tool: string) => {
        if (tool === 'ping') {
          return { available: true, command: 'ping' };
        }
        return { available: false, command: tool, message: 'not available' };
      });

      const result = validateNetworkTools();

      expect(result.availableTools.has('ping')).toBe(true);
      expect(result.toolStatus.ping.available).toBe(true);
    });
  });

  describe('tcpdump validation on Linux', () => {
    beforeEach(() => {
      mockedGetPlatform.mockReturnValue('linux');
    });

    it('should detect tcpdump when execution test succeeds on Linux', () => {
      mockedCheckToolAvailability.mockImplementation((tool: string) => {
        if (tool === 'tcpdump') {
          return { available: true, command: '/usr/bin/tcpdump' };
        }
        return { available: false, command: tool, message: 'not available' };
      });

      // Mock successful tcpdump execution (no permission errors)
      mockedExecSync.mockReturnValue('tcpdump: listening on any, link-type EN10MB' as any);

      const result = validateNetworkTools();

      expect(result.availableTools.has('tcpdump')).toBe(true);
      expect(result.toolStatus.tcpdump.available).toBe(true);
    });

    it('should detect tcpdump permission denied on Linux', () => {
      mockedCheckToolAvailability.mockImplementation((tool: string) => {
        if (tool === 'tcpdump') {
          return { available: true, command: '/usr/bin/tcpdump' };
        }
        return { available: false, command: tool, message: 'not available' };
      });

      // Mock permission denied error
      mockedExecSync.mockReturnValue('tcpdump: permission denied' as any);

      const result = validateNetworkTools();

      expect(result.availableTools.has('tcpdump')).toBe(false);
      expect(result.toolStatus.tcpdump.available).toBe(false);
      expect(result.toolStatus.tcpdump.reason).toContain('elevated permissions');
    });
  });

  describe('tcpdump validation on macOS', () => {
    beforeEach(() => {
      mockedGetPlatform.mockReturnValue('darwin');
    });

    it('should detect tcpdump when execution test succeeds on macOS', () => {
      mockedCheckToolAvailability.mockImplementation((tool: string) => {
        if (tool === 'tcpdump') {
          return { available: true, command: '/usr/sbin/tcpdump' };
        }
        return { available: false, command: tool, message: 'not available' };
      });

      // Mock successful tcpdump -D output (list interfaces)
      mockedExecSync.mockReturnValue('1.en0 [Up, Running]\n2.en1 [Up, Running]' as any);

      const result = validateNetworkTools();

      expect(result.availableTools.has('tcpdump')).toBe(true);
      expect(result.toolStatus.tcpdump.available).toBe(true);
    });

    it('should detect tcpdump permission denied on macOS', () => {
      mockedCheckToolAvailability.mockImplementation((tool: string) => {
        if (tool === 'tcpdump') {
          return { available: true, command: '/usr/sbin/tcpdump' };
        }
        return { available: false, command: tool, message: 'not available' };
      });

      // Mock permission denied error
      mockedExecSync.mockReturnValue('tcpdump: operation not permitted' as any);

      const result = validateNetworkTools();

      expect(result.availableTools.has('tcpdump')).toBe(false);
      expect(result.toolStatus.tcpdump.available).toBe(false);
      expect(result.toolStatus.tcpdump.reason).toContain('elevated permissions');
    });

    it('should provide macOS-specific instructions for tcpdump', () => {
      mockedCheckToolAvailability.mockImplementation((tool: string) => {
        if (tool === 'tcpdump') {
          return { available: true, command: '/usr/sbin/tcpdump' };
        }
        return { available: false, command: tool, message: 'not available' };
      });

      // Mock permission denied
      mockedExecSync.mockReturnValue("you don't have permission to capture" as any);

      const result = validateNetworkTools();

      expect(result.toolStatus.tcpdump.reason).toContain('BPF device access');
      expect(result.toolStatus.tcpdump.reason).not.toContain('setcap');
    });
  });

  describe('tcpdump validation with execution errors', () => {
    it('should allow tcpdump when non-permission errors occur', () => {
      mockedGetPlatform.mockReturnValue('darwin');

      mockedCheckToolAvailability.mockImplementation((tool: string) => {
        if (tool === 'tcpdump') {
          return { available: true, command: '/usr/sbin/tcpdump' };
        }
        return { available: false, command: tool, message: 'not available' };
      });

      // Mock timeout error (non-permission issue)
      const timeoutError: any = new Error('Command timeout');
      timeoutError.code = 'ETIMEDOUT';
      mockedExecSync.mockImplementation(() => {
        throw timeoutError;
      });

      const result = validateNetworkTools();

      // Timeout is not a permission issue, so tcpdump should be marked as available
      expect(result.availableTools.has('tcpdump')).toBe(true);
      expect(result.toolStatus.tcpdump.available).toBe(true);
    });
  });
});
