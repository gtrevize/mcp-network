# Changelog

## [Unreleased] - 2025-11-11

### Changed

#### get_ip_address Tool Behavior (REVERTED and IMPROVED)
- **Previous Behavior**: Provided guidance/instructions for IP detection (not actual IP)
- **New Behavior**: Actually detects and returns the server's public IPv4 address
- **Implementation**:
  - **Primary Method**: DNS queries (fastest, ~80ms)
    - OpenDNS resolvers (resolver1.opendns.com, resolver2.opendns.com)
    - Google DNS resolver (ns1.google.com)
  - **Fallback Method**: API services if DNS fails
    - api.ipify.org
    - api4.my-ip.io
    - icanhazip.com
- **Performance**:
  - DNS detection: ~80-100ms (typical)
  - API fallback: ~200-500ms (if needed)
- **Result Structure**:
  - `ipv4`: Detected IPv4 address
  - `ipv6`: IPv6 address (future enhancement)
  - `method`: Detection method used (e.g., "DNS (resolver1.opendns.com)")
- **Rationale**: DNS queries are faster and simpler than HTTP APIs, with reliable fallback

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

#### Reverse DNS Lookup Tool (`reverse_dns`)
- **Feature**: New tool for performing reverse DNS lookups (PTR record queries)
- **Implementation**:
  - Uses `dig -x` command for automatic PTR record resolution
  - Supports both IPv4 and IPv6 addresses
  - Returns all hostnames associated with an IP address
  - Provides the PTR record name for reference (in-addr.arpa format)
- **Performance**:
  - Typical execution time: 25-100ms for local/private IPs
  - Public IPs: 70-1200ms depending on DNS server response
- **Use Cases**:
  - Verify server hostnames from IP addresses
  - Investigate network connections
  - Validate reverse DNS configuration
  - Security and forensic analysis
- **Permissions**:
  - Added `network:reverse_dns` permission
  - Available to all roles (admin, network_engineer, developer, auditor, readonly)
- **Testing**:
  - Tested with Google DNS (8.8.8.8)
  - Tested with Cloudflare DNS (1.1.1.1) - returns "one.one.one.one"
  - Tested with private IPs (192.168.1.1) - correctly returns empty hostnames
- **Files**:
  - `src/tools/reverse-dns.ts`: Tool implementation
  - `src/types/index.ts`: ReverseDnsOptions and ReverseDnsResult interfaces

#### IP Geolocation Tool (`ip_geolocation`)
- **Feature**: New tool for retrieving geolocation information for IP addresses
- **Implementation**:
  - Multiple API service fallbacks for reliability:
    - Primary: ip-api.com (free, comprehensive data)
    - Secondary: ipapi.co (alternative JSON API)
    - Tertiary: ipwhois.app (backup service)
  - Web scraping fallback if all APIs fail (iplocation.net)
  - Returns comprehensive geolocation data:
    - Country, region, city information
    - Geographic coordinates (latitude/longitude)
    - Timezone information
    - ISP and organization details
    - AS number
- **Security**:
  - Full input validation through existing validateHost()
  - Protection against malicious inputs
  - Configurable timeout (default 10s, max 30s)
- **Permissions**:
  - Added `network:ip_geolocation` permission
  - Available to all roles (admin, network_engineer, developer, auditor, readonly)
- **Testing**:
  - Comprehensive test suite with 12 tests
  - Mocked API responses for reliable testing
  - Input validation coverage
  - Error handling verification
- **Files**:
  - `src/tools/ip-geolocation.ts`: Tool implementation
  - `src/types/index.ts`: IpGeolocationOptions and IpGeolocationResult interfaces
  - `src/__tests__/ip-geolocation.test.ts`: Test suite

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
