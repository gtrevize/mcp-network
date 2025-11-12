/**
 * Output validation framework for tool results
 * Ensures all tools return valid, expected data structures
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate ping statistics
 */
export function validatePingStats(stats: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (typeof stats.packetsSent !== 'number' || stats.packetsSent < 0) {
    errors.push('packetsSent must be a non-negative number');
  }

  if (typeof stats.packetsReceived !== 'number' || stats.packetsReceived < 0) {
    errors.push('packetsReceived must be a non-negative number');
  }

  if (typeof stats.packetLoss !== 'number' || stats.packetLoss < 0 || stats.packetLoss > 100) {
    errors.push('packetLoss must be a number between 0 and 100');
  }

  // RTT fields should be present if packets were received
  if (stats.packetsReceived > 0) {
    if (typeof stats.minRtt !== 'number' || stats.minRtt < 0) {
      warnings.push('minRtt should be a non-negative number when packets are received');
    }

    if (typeof stats.avgRtt !== 'number' || stats.avgRtt < 0) {
      warnings.push('avgRtt should be a non-negative number when packets are received');
    }

    if (typeof stats.maxRtt !== 'number' || stats.maxRtt < 0) {
      warnings.push('maxRtt should be a non-negative number when packets are received');
    }

    // Sanity check: min <= avg <= max
    if (stats.minRtt > stats.avgRtt || stats.avgRtt > stats.maxRtt) {
      warnings.push('RTT values should satisfy: min <= avg <= max');
    }
  }

  // Sanity check: packetsReceived should not exceed packetsSent
  if (stats.packetsReceived > stats.packetsSent) {
    errors.push('packetsReceived cannot exceed packetsSent');
  }

  // Verify packet loss calculation
  if (stats.packetsSent > 0) {
    const expectedLoss = ((stats.packetsSent - stats.packetsReceived) / stats.packetsSent) * 100;
    const lossDiff = Math.abs(expectedLoss - stats.packetLoss);
    if (lossDiff > 1) { // Allow 1% tolerance for rounding
      warnings.push(`Packet loss calculation may be incorrect: expected ~${expectedLoss.toFixed(1)}%, got ${stats.packetLoss}%`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate traceroute hops
 */
export function validateTracerouteHops(hops: any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(hops)) {
    errors.push('hops must be an array');
    return { valid: false, errors, warnings };
  }

  for (let i = 0; i < hops.length; i++) {
    const hop = hops[i];

    // Validate hop number
    if (typeof hop.hop !== 'number' || hop.hop < 1) {
      errors.push(`Hop ${i}: hop number must be a positive integer`);
    }

    // Hop numbers should be sequential
    if (i > 0 && hop.hop !== hops[i - 1].hop + 1) {
      warnings.push(`Hop ${i}: hop number ${hop.hop} is not sequential (expected ${hops[i - 1].hop + 1})`);
    }

    // Validate IP address format if present
    if (hop.ip !== null) {
      if (typeof hop.ip !== 'string' || !isValidIpAddress(hop.ip)) {
        warnings.push(`Hop ${i}: invalid IP address format: ${hop.ip}`);
      }
    }

    // Validate timings
    if (Array.isArray(hop.timings)) {
      for (const timing of hop.timings) {
        if (typeof timing !== 'number' || timing < 0) {
          warnings.push(`Hop ${i}: timing values must be non-negative numbers`);
        }
      }

      // Validate avgTime calculation
      if (hop.timings.length > 0 && hop.avgTime !== null) {
        const expectedAvg = hop.timings.reduce((a: number, b: number) => a + b, 0) / hop.timings.length;
        const avgDiff = Math.abs(expectedAvg - hop.avgTime);
        if (avgDiff > 0.01) { // Allow small floating point errors
          warnings.push(`Hop ${i}: avgTime calculation may be incorrect`);
        }
      }
    }

    // Timeout hops should have empty timings and null IPs
    if (hop.timeout === true) {
      if (hop.timings && hop.timings.length > 0) {
        warnings.push(`Hop ${i}: timeout hop should not have timing values`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate DNS records
 */
export function validateDnsRecords(records: any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(records)) {
    errors.push('records must be an array');
    return { valid: false, errors, warnings };
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // All records should have a type
    if (!record.type || typeof record.type !== 'string') {
      errors.push(`Record ${i}: missing or invalid type`);
    }

    // All records should have a value
    if (record.value === undefined || record.value === null) {
      errors.push(`Record ${i}: missing value`);
    }

    // Type-specific validation
    if (record.type === 'A' && record.value) {
      if (!isValidIpv4Address(record.value)) {
        warnings.push(`Record ${i}: A record should contain a valid IPv4 address`);
      }
    }

    if (record.type === 'AAAA' && record.value) {
      if (!isValidIpv6Address(record.value)) {
        warnings.push(`Record ${i}: AAAA record should contain a valid IPv6 address`);
      }
    }

    if (record.type === 'MX' && record.priority !== undefined) {
      if (typeof record.priority !== 'number' || record.priority < 0) {
        warnings.push(`Record ${i}: MX priority should be a non-negative number`);
      }
    }

    // TTL should be a non-negative number if present
    if (record.ttl !== undefined && (typeof record.ttl !== 'number' || record.ttl < 0)) {
      warnings.push(`Record ${i}: TTL should be a non-negative number`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate nmap port scan results
 */
export function validatePortScanResults(ports: any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(ports)) {
    errors.push('ports must be an array');
    return { valid: false, errors, warnings };
  }

  const validStates = ['open', 'closed', 'filtered', 'unfiltered', 'open|filtered', 'closed|filtered'];
  const validProtocols = ['tcp', 'udp', 'sctp'];

  for (let i = 0; i < ports.length; i++) {
    const port = ports[i];

    // Validate port number
    if (typeof port.port !== 'number' || port.port < 1 || port.port > 65535) {
      errors.push(`Port ${i}: port number must be between 1 and 65535`);
    }

    // Validate protocol
    if (!validProtocols.includes(port.protocol)) {
      warnings.push(`Port ${i}: unexpected protocol '${port.protocol}'`);
    }

    // Validate state
    if (!validStates.includes(port.state)) {
      warnings.push(`Port ${i}: unexpected state '${port.state}'`);
    }

    // Service should be a string if present
    if (port.service !== undefined && typeof port.service !== 'string') {
      warnings.push(`Port ${i}: service should be a string`);
    }
  }

  // Check for duplicate ports
  const portNumbers = ports.map(p => p.port);
  const duplicates = portNumbers.filter((port, index) => portNumbers.indexOf(port) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate port numbers found: ${duplicates.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate WHOIS data
 */
export function validateWhoisData(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Data should be an object
  if (typeof data !== 'object' || data === null) {
    errors.push('WHOIS data must be an object');
    return { valid: false, errors, warnings };
  }

  // Arrays should be arrays
  if (data.nameServers !== undefined && !Array.isArray(data.nameServers)) {
    errors.push('nameServers must be an array');
  }

  if (data.status !== undefined && !Array.isArray(data.status)) {
    errors.push('status must be an array');
  }

  if (data.emails !== undefined && !Array.isArray(data.emails)) {
    errors.push('emails must be an array');
  }

  if (data.phones !== undefined && !Array.isArray(data.phones)) {
    errors.push('phones must be an array');
  }

  // Validate dates if present
  if (data.createdDate && typeof data.createdDate === 'string') {
    const createdDate = new Date(data.createdDate);
    if (isNaN(createdDate.getTime())) {
      warnings.push('createdDate is not a valid date format');
    }
  }

  if (data.expiryDate && typeof data.expiryDate === 'string') {
    const expiryDate = new Date(data.expiryDate);
    if (isNaN(expiryDate.getTime())) {
      warnings.push('expiryDate is not a valid date format');
    } else {
      // Check if domain is expired
      if (expiryDate.getTime() < Date.now()) {
        warnings.push('Domain has expired');
      }
    }
  }

  if (data.updatedDate && typeof data.updatedDate === 'string') {
    const updatedDate = new Date(data.updatedDate);
    if (isNaN(updatedDate.getTime())) {
      warnings.push('updatedDate is not a valid date format');
    }
  }

  // Validate date relationships if all dates are present
  if (data.createdDate && data.updatedDate && data.expiryDate) {
    const created = new Date(data.createdDate);
    const updated = new Date(data.updatedDate);
    const expiry = new Date(data.expiryDate);

    if (!isNaN(created.getTime()) && !isNaN(expiry.getTime())) {
      // Created date should be before expiry date
      if (created.getTime() >= expiry.getTime()) {
        warnings.push('createdDate should be before expiryDate');
      }
    }

    if (!isNaN(created.getTime()) && !isNaN(updated.getTime())) {
      // Updated date should be after or equal to created date
      if (updated.getTime() < created.getTime()) {
        warnings.push('updatedDate should be after createdDate');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate API test response
 */
export function validateApiTestResponse(response: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Status code must be present
  if (typeof response.status !== 'number') {
    errors.push('status code must be a number');
  } else {
    // Status code should be in valid HTTP range
    if (response.status < 100 || response.status > 599) {
      warnings.push(`Unusual HTTP status code: ${response.status}`);
    }
  }

  // Response time should be non-negative
  if (response.responseTime !== undefined) {
    if (typeof response.responseTime !== 'number' || response.responseTime < 0) {
      warnings.push('responseTime should be a non-negative number');
    }
  }

  // Headers should be an object if present
  if (response.headers !== undefined && typeof response.headers !== 'object') {
    warnings.push('headers should be an object');
  }

  // Content length should match body if both present
  if (response.headers && response.headers['content-length'] && response.body) {
    const declaredLength = parseInt(response.headers['content-length']);
    const actualLength = typeof response.body === 'string' ? response.body.length : JSON.stringify(response.body).length;
    if (Math.abs(declaredLength - actualLength) > 10) { // Allow some tolerance for encoding
      warnings.push('Content-Length header does not match actual body size');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate TLS certificate information
 */
export function validateTlsCertificate(cert: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!cert.subject || typeof cert.subject !== 'object') {
    errors.push('subject must be present and be an object');
  }

  if (!cert.issuer || typeof cert.issuer !== 'object') {
    errors.push('issuer must be present and be an object');
  }

  // Validate dates
  if (cert.validFrom) {
    const validFrom = new Date(cert.validFrom);
    if (isNaN(validFrom.getTime())) {
      errors.push('validFrom must be a valid date');
    }
  }

  if (cert.validTo) {
    const validTo = new Date(cert.validTo);
    if (isNaN(validTo.getTime())) {
      errors.push('validTo must be a valid date');
    }

    // Check if certificate is expired
    if (validTo.getTime() < Date.now()) {
      warnings.push('Certificate has expired');
    }

    // Check if certificate is not yet valid
    if (cert.validFrom) {
      const validFrom = new Date(cert.validFrom);
      if (validFrom.getTime() > Date.now()) {
        warnings.push('Certificate is not yet valid');
      }

      // validFrom should be before validTo
      if (validFrom.getTime() >= validTo.getTime()) {
        errors.push('validFrom must be before validTo');
      }
    }
  }

  // Validate fingerprints if present
  if (cert.fingerprint && typeof cert.fingerprint !== 'string') {
    warnings.push('fingerprint should be a string');
  }

  if (cert.fingerprint256 && typeof cert.fingerprint256 !== 'string') {
    warnings.push('fingerprint256 should be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate iperf results
 */
export function validateIperfResults(results: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Mode should be specified
  if (!results.mode || !['client', 'server'].includes(results.mode)) {
    errors.push('mode must be either "client" or "server"');
  }

  // Bandwidth results
  if (results.bandwidth !== undefined) {
    if (typeof results.bandwidth !== 'number' || results.bandwidth < 0) {
      warnings.push('bandwidth should be a non-negative number');
    }
  }

  // Transfer results
  if (results.transfer !== undefined) {
    if (typeof results.transfer !== 'number' || results.transfer < 0) {
      warnings.push('transfer should be a non-negative number');
    }
  }

  // Protocol should be tcp or udp
  if (results.protocol && !['tcp', 'udp'].includes(results.protocol)) {
    warnings.push('protocol should be "tcp" or "udp"');
  }

  // Jitter for UDP
  if (results.protocol === 'udp' && results.jitter !== undefined) {
    if (typeof results.jitter !== 'number' || results.jitter < 0) {
      warnings.push('jitter should be a non-negative number');
    }
  }

  // Packet loss for UDP
  if (results.protocol === 'udp' && results.packetLoss !== undefined) {
    if (typeof results.packetLoss !== 'number' || results.packetLoss < 0 || results.packetLoss > 100) {
      warnings.push('packetLoss should be between 0 and 100');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Helper: Validate IP address format
 */
function isValidIpAddress(ip: string): boolean {
  return isValidIpv4Address(ip) || isValidIpv6Address(ip);
}

/**
 * Helper: Validate IPv4 address
 */
function isValidIpv4Address(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;

  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part);
    return num >= 0 && num <= 255;
  });
}

/**
 * Helper: Validate IPv6 address
 */
function isValidIpv6Address(ip: string): boolean {
  // Simplified IPv6 validation
  const ipv6Regex = /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/i;
  const ipv6RegexCompressed = /^([\da-f]{0,4}:){2,7}[\da-f]{0,4}$/i;
  const ipv6RegexMixed = /^([\da-f]{0,4}:){1,6}(\d{1,3}\.){3}\d{1,3}$/i;

  return ipv6Regex.test(ip) || ipv6RegexCompressed.test(ip) || ipv6RegexMixed.test(ip);
}

/**
 * General result validator - checks common fields
 */
export function validateToolResult(result: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (typeof result.success !== 'boolean') {
    errors.push('success field must be a boolean');
  }

  if (typeof result.executionTime !== 'number' || result.executionTime < 0) {
    warnings.push('executionTime should be a non-negative number');
  }

  if (!result.timestamp || typeof result.timestamp !== 'string') {
    warnings.push('timestamp should be a string');
  } else {
    const timestamp = new Date(result.timestamp);
    if (isNaN(timestamp.getTime())) {
      warnings.push('timestamp should be a valid ISO date string');
    }
  }

  // If successful, data should be present
  if (result.success && result.data === undefined) {
    warnings.push('Successful results should include data');
  }

  // If failed, error should be present
  if (!result.success && !result.error) {
    warnings.push('Failed results should include an error message');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
