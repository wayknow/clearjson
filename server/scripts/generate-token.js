#!/usr/bin/env node
/**
 * Generate an API token and insert its hash into D1.
 * Usage: node scripts/generate-token.js <token-name> <token-value>
 *    or: echo "my-secret-token" | node scripts/generate-token.js <token-name>
 *
 * For local dev, you can also insert manually via:
 *    npx wrangler d1 execute clearjson-license-db --command "
 *      INSERT INTO api_tokens (name, token_hash) VALUES ('admin', 'SHA256_HASH_HERE');
 *    "
 *
 * To compute SHA-256 in terminal:
 *    echo -n 'your-token' | shasum -a 256
 */

import { createHash } from 'node:crypto';

const name = process.argv[2];
if (!name) {
  console.error('Usage: node scripts/generate-token.js <token-name> [token-value]');
  console.error('  If token-value is omitted, reads from stdin.');
  process.exit(1);
}

let tokenValue = process.argv[3];

if (!tokenValue) {
  // Read from stdin
  const chunks = [];
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  tokenValue = chunks.join('').trim();
}

if (!tokenValue) {
  console.error('Error: no token value provided.');
  process.exit(1);
}

if (tokenValue.length < 16) {
  console.error('Warning: token is short (< 16 chars). Consider using a longer random string.');
}

const hash = createHash('sha256').update(tokenValue).digest('hex');
console.log(`Token name : ${name}`);
console.log(`Token hash : ${hash}`);
console.log('');
console.log('Run this SQL to insert into D1:');
console.log(`  npx wrangler d1 execute clearjson-license-db --command \\`);
console.log(`    "INSERT INTO api_tokens (name, token_hash) VALUES ('${name}', '${hash}');"`);
console.log('');
console.log('Then use the token as:');
console.log(`  Authorization: Bearer ${tokenValue}`);
