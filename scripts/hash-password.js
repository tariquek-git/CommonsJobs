#!/usr/bin/env node
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.js <password>');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log('\nADMIN_PASSWORD_HASH=' + hash);
console.log('\nAdd this to your Vercel environment variables.\n');
