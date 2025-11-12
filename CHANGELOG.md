# Changelog

## [Unreleased] - 2025-11-11

### Fixed

#### tcpdump Validation on macOS
- **Issue**: Permission-based validation failed for non-root users on macOS
  - Previous implementation checked file permissions (setuid bit) and Linux-specific capabilities
  - Used `getcap` command which doesn't exist on macOS
  - Gave false negatives for users with legitimate tcpdump access

- **Solution**: Execution-based validation
  - macOS: Runs `tcpdump -D` (list interfaces) to test actual access
  - Linux: Runs `tcpdump -c 1 -i any` with timeout
  - Parses output for permission errors (e.g., "permission denied", "operation not permitted")
  - Non-permission errors (e.g., timeout) treated as success

- **Changes**:
  - `src/utils/startup-validator.ts`: Removed `hasSudoPrivileges()`, rewrote `canRunTcpdump()`
  - `src/__tests__/startup-validator.test.ts`: Updated all tcpdump tests to mock execution

- **Result**: tcpdump now correctly detected as available for non-root users on macOS

#### Port Scanner Throttling
- **Issue**: Default throttling too conservative for large port ranges
  - Default: 100ms between scans = 10 packets/second
  - Scanning 1000 ports at 10 pkt/sec requires 100 seconds
  - Default timeout was 60 seconds
  - Result: Scans timed out before completion, returning empty results

- **Solution**: Smart throttling with dynamic rate calculation
  - Increased default throttle: 100ms → 20ms (50 packets/second)
  - Added port count estimation from port specification string
  - Implemented optimal rate calculation:
    ```
    requiredRate = portCount / (timeout × 0.8)  // 80% safety margin
    finalRate = clamp(requiredRate, 10, 100)     // bounded [10, 100] pkt/sec
    ```
  - User-specified throttle still takes precedence

- **Changes**:
  - `src/tools/nmap.ts`:
    - Reduced `DEFAULT_THROTTLE_MS` from 100 to 20
    - Added `estimatePortCount()` function to parse port specifications
    - Added `calculateOptimalRate()` function for dynamic rate calculation
    - Modified command building to use calculated rate

- **Result**: Successfully scans 1000 ports in ~48 seconds (within 60s timeout)

### Added

#### Integration Tests
- **File**: `src/__tests__/integration.test.ts`
- **Coverage**:
  - API testing with live httpbin.org endpoints
    - GET, POST requests
    - Status code validation (200, 201, 404)
    - Error handling
  - Port scanning with real targets
    - localhost (127.0.0.1)
    - Private network IPs
    - Security validation (hostname rejection, CIDR rejection)

- **Test Results**: 10 tests (9 passed, 1 skipped)

#### Comprehensive Test Results Documentation
- **File**: `TEST_RESULTS.md`
- **Contents**:
  - Detailed test environment information
  - API testing results with httpbin.org
  - Port scanning results for multiple targets:
    - 127.0.0.1 (localhost)
    - 192.168.1.1 (router)
    - 192.168.240.48 (mail/file server) - NEW
  - Performance metrics
  - Security feature verification
  - Tool capability documentation

### Verified

#### API Testing Tool (`test_api`)
- **Endpoint**: https://httpbin.org
- **Tests**: 5/5 passed
- **Verified Features**:
  - GET requests with status 200
  - POST requests with JSON body
  - Non-200 status code handling (404)
  - Expected status validation (201)
  - Status mismatch detection

#### Port Scanning Tool (`port_scan`)
- **Targets Tested**:
  - 127.0.0.1: Found SSH (port 22)
  - 192.168.1.1: Found 3 filtered ports
  - 192.168.240.48: Found 6 open ports (SSH, SMTP, POP3, IMAP, SMB, IMAPS)
- **Tests**: 4/4 passed
- **Verified Features**:
  - TCP connect scan
  - Port range scanning (1-1000)
  - Specific port scanning
  - Smart throttling (adaptive rate)
  - Security: hostname rejection
  - Security: CIDR range rejection

#### tcpdump Tool (`tcpdump`)
- **Test**: Packet capture with 2-second duration
- **Result**: Successfully captured 394 packets (148KB, compressed to 130KB)
- **Verified Features**:
  - Packet capture with time limit
  - Size limit enforcement
  - Compression (gzip)
  - Interface selection
  - Temporary file cleanup

### Test Suite Status
- **Total Test Suites**: 6
- **Total Tests**: 70 (69 passed, 1 skipped)
- **Coverage**: 70% (branches, functions, lines, statements)
- **Execution Time**: ~6-8 seconds

### Known Issues

#### Let's Encrypt Tool
- **Status**: Not tested in this session
- **Note**: Requires domain ownership and DNS configuration for proper testing
- **Recommendation**: Test manually in production environment with valid domain

### Workarounds Applied

1. **macOS tcpdump permissions**
   - Instead of requiring setuid bit, server now runs actual tcpdump test
   - Gracefully handles permission errors with helpful messages
   - Works for users with BPF device access

2. **Port scan timeout**
   - Automatic rate calculation ensures scans complete within timeout
   - Falls back to safe defaults (10-100 pkt/sec range)
   - User can still override with manual throttle setting

3. **HTTP test warnings**
   - httpbin.org returns Content-Length that doesn't match actual body
   - Added warning system instead of hard failure
   - Does not affect test success status

### Performance Improvements

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| tcpdump validation | Permission check (instant) | Execution test (~100ms) | More reliable |
| Port scan (1000 ports) | 100s+ (timeout) | 48s | ~50% faster |
| Port scan (specific) | N/A | <1s | Optimal |

### Breaking Changes
None - all changes are backward compatible

### Migration Notes
No migration required - changes are transparent to users

---

## Format
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
