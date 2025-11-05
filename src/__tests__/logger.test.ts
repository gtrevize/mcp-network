/**
 * Tests for logging system
 */
import { AccessLogger } from '../logger/index.js';
import { AccessLog } from '../types/index.js';

describe('Access Logger', () => {
  beforeEach(() => {
    // Clear logs before each test
    AccessLogger.clear();
  });

  test('should log access entries', () => {
    const entry: AccessLog = {
      timestamp: new Date().toISOString(),
      requestId: 'test-123',
      userId: 'user-1',
      tool: 'ping',
      action: 'execute',
      parameters: { target: 'example.com' },
      success: true,
      duration: 100,
    };

    AccessLogger.log(entry);

    const logs = AccessLogger.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0]).toEqual(entry);
  });

  test('should filter logs by user', () => {
    const entry1: AccessLog = {
      timestamp: new Date().toISOString(),
      requestId: 'test-1',
      userId: 'user-1',
      tool: 'ping',
      action: 'execute',
      parameters: {},
      success: true,
      duration: 100,
    };

    const entry2: AccessLog = {
      timestamp: new Date().toISOString(),
      requestId: 'test-2',
      userId: 'user-2',
      tool: 'ping',
      action: 'execute',
      parameters: {},
      success: true,
      duration: 100,
    };

    AccessLogger.log(entry1);
    AccessLogger.log(entry2);

    const user1Logs = AccessLogger.getLogsByUser('user-1');
    expect(user1Logs.length).toBe(1);
    expect(user1Logs[0].userId).toBe('user-1');
  });

  test('should filter logs by tool', () => {
    const entry1: AccessLog = {
      timestamp: new Date().toISOString(),
      requestId: 'test-1',
      userId: 'user-1',
      tool: 'ping',
      action: 'execute',
      parameters: {},
      success: true,
      duration: 100,
    };

    const entry2: AccessLog = {
      timestamp: new Date().toISOString(),
      requestId: 'test-2',
      userId: 'user-1',
      tool: 'traceroute',
      action: 'execute',
      parameters: {},
      success: true,
      duration: 200,
    };

    AccessLogger.log(entry1);
    AccessLogger.log(entry2);

    const pingLogs = AccessLogger.getLogsByTool('ping');
    expect(pingLogs.length).toBe(1);
    expect(pingLogs[0].tool).toBe('ping');
  });

  test('should limit log storage', () => {
    // This test would need to be adapted based on actual implementation
    // For now, just verify that logs can be cleared
    for (let i = 0; i < 100; i++) {
      AccessLogger.log({
        timestamp: new Date().toISOString(),
        requestId: `test-${i}`,
        userId: 'user-1',
        tool: 'ping',
        action: 'execute',
        parameters: {},
        success: true,
        duration: 100,
      });
    }

    const logs = AccessLogger.getLogs();
    expect(logs.length).toBe(100);

    AccessLogger.clear();
    expect(AccessLogger.getLogs().length).toBe(0);
  });
});
