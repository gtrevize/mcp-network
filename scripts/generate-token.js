#!/usr/bin/env node

import { generateAuthToken } from '../dist/auth/jwt.js';

const userId = process.argv[2] || 'admin-user';
const role = process.argv[3] || 'admin';

console.log('\n🔐 Generating Authentication Token\n');
console.log('User ID:', userId);
console.log('Role:', role);

const token = generateAuthToken(userId, [role]);

console.log('\nToken:');
console.log(token);
console.log('\nTo use this token, set it as an environment variable:');
console.log(`export AUTH_TOKEN="${token}"`);
console.log('\nThen run your server or client:');
console.log('npm start\nnpm run client\n');
