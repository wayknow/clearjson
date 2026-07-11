#!/usr/bin/env node
/**
 * Creem webhook simulator — test the license-issuing path without paying.
 *
 * Signs a `checkout.completed` payload with CREEM_WEBHOOK_SECRET (same HMAC-SHA256
 * hex scheme the Worker's verifyCreemSignature() checks) and POSTs it to the
 * webhook endpoint. On success the server generates a real CLJ-XXXX key in D1 and
 * emails it via Resend — exactly what a real Creem payment triggers.
 *
 * Usage:
 *   CREEM_WEBHOOK_SECRET=xxx node server/test-webhook.js you@example.com
 *   CREEM_WEBHOOK_SECRET=xxx node server/test-webhook.js you@example.com --url http://localhost:8787/clearjson/api/webhook/creem
 *   CREEM_WEBHOOK_SECRET=xxx node server/test-webhook.js you@example.com --order ord_fixed123   # re-use order id to test idempotency
 *
 * Notes:
 *   - Secret is read from the env var only (never hardcode / log it).
 *   - A unique order id is generated per run unless --order is passed, so repeat
 *     runs each issue a new key (the server dedupes by creem_order_id).
 */

'use strict';

const crypto = require('crypto');

const DEFAULT_URL = 'https://api.wayknow.tech/clearjson/api/webhook/creem';

function parseArgs(argv) {
  const args = { email: null, url: DEFAULT_URL, order: null };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--url') { args.url = rest[++i]; }
    else if (a === '--order') { args.order = rest[++i]; }
    else if (!args.email) { args.email = a; }
  }
  return args;
}

async function main() {
  const { email, url, order } = parseArgs(process.argv);
  const secret = process.env.CREEM_WEBHOOK_SECRET;

  if (!secret) {
    console.error('ERROR: set CREEM_WEBHOOK_SECRET env var (the Worker secret you configured with `wrangler secret put`).');
    process.exit(1);
  }
  if (!email || !email.includes('@')) {
    console.error('ERROR: pass a customer email as the first argument.');
    console.error('  CREEM_WEBHOOK_SECRET=xxx node server/test-webhook.js you@example.com');
    process.exit(1);
  }

  // Unique-ish ids without external deps. Date.now()/random are fine in a plain
  // node script (only workflow scripts forbid them).
  const orderId = order || ('ord_test_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36));
  const customerId = 'cust_test_' + Date.now().toString(36);

  // Shape must match handleCreemWebhook(): body.eventType + body.object.{customer,order}
  const payload = {
    eventType: 'checkout.completed',
    object: {
      customer: { email, id: customerId },
      order: { id: orderId },
    },
  };

  // The bytes we sign MUST equal the bytes we send.
  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

  console.log('POST ' + url);
  console.log('  email:      ' + email);
  console.log('  order id:   ' + orderId);
  console.log('  body:       ' + rawBody);
  console.log('  signature:  ' + signature.slice(0, 16) + '… (' + signature.length + ' hex chars)');
  console.log('');

  let res, text;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'creem-signature': signature,
      },
      body: rawBody,
    });
    text = await res.text();
  } catch (err) {
    console.error('Request failed: ' + err.message);
    process.exit(1);
  }

  console.log('HTTP ' + res.status);
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  console.log(parsed ? JSON.stringify(parsed, null, 2) : text);

  if (res.ok && parsed && parsed.action === 'license_issued') {
    console.log('\n✓ Key issued: ' + parsed.license_key + ' → check ' + email + ' inbox (Resend).');
  } else if (parsed && parsed.action === 'already_issued') {
    console.log('\n↺ This order id was already used; server returned the existing key: ' + parsed.license_key);
  } else if (res.status === 401) {
    console.log('\n✗ Signature rejected — CREEM_WEBHOOK_SECRET does not match the Worker secret.');
  }

  process.exit(res.ok ? 0 : 1);
}

main();
