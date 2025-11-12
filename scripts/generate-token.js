#!/usr/bin/env node

import { generateTestToken } from '../dist/auth/jwt.js';

const role = process.argv[2] || 'admin';
const userId = process.argv[3] || 'cli-user';

console.log('\n🔐 Generating JWT Token\n');
console.log('User ID:', userId);
console.log('Role:', role);
console.log('\nToken:');
console.log(generateTestToken(userId, [role]));
console.log('\nTo use this token, run:');
console.log(`export MCP_AUTH_TOKEN="${generateTestToken(userId, [role])}"`);
console.log('npm run client\n');
