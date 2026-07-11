/**
 * ClearJSON License Server — Cloudflare Worker
 *
 * Endpoints:
 *   POST /api/license/verify       — Public: validate a license key + device binding
 *   POST /api/license/generate     — Admin: generate license key(s)
 *   POST /api/webhook/creem        — Creem payment webhook → auto-generate key + email
 *   GET  /api/checkout/pro         — Public: return Creem payment URL
 *   GET  /api/admin/licenses       — Admin: list licenses (with optional ?email= filter)
 */

// ============ Configuration ============

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Rate limit: max 60 verify requests per IP per minute (simple in-memory sliding window)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const rateLimitMap = new Map();

// License key format
const KEY_PREFIX = 'CLJ';
const KEY_SEGMENT_LEN = 4;
const KEY_SEGMENTS = 3;
const MAX_DEVICES = 3;

// Creem product ID — set in Cloudflare Worker env var CREEM_PRODUCT_ID
const CREEM_CHECKOUT_URL = 'https://www.creem.io/payment/prod_5Aha8NpKKi8AUd2sLaPRgM';

// ============ Helpers ============

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function randomChars(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/l to avoid confusion
  let result = '';
  const rand = new Uint8Array(len);
  crypto.getRandomValues(rand);
  for (let i = 0; i < len; i++) {
    result += chars[rand[i] % chars.length];
  }
  return result;
}

function generateLicenseKey() {
  const segments = [];
  for (let i = 0; i < KEY_SEGMENTS; i++) {
    segments.push(randomChars(KEY_SEGMENT_LEN));
  }
  return `${KEY_PREFIX}-${segments.join('-')}`;
}

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function deviceFingerprint(deviceId, userAgent) {
  const ua = (userAgent || '').slice(0, 80);
  return `${deviceId || 'unknown'}|${ua}`;
}

function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  if (rateLimitMap.size > 10000) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    for (const [key, val] of rateLimitMap) {
      if (now - val.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitMap.delete(key);
    }
  }
  return entry.count <= RATE_LIMIT_MAX;
}

// ============ Auth Middleware ============

async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const tokenHash = await sha256(token);

  const result = await env.DB.prepare(
    'SELECT id FROM api_tokens WHERE token_hash = ?'
  ).bind(tokenHash).first();

  if (result) {
    await env.DB.prepare(
      'UPDATE api_tokens SET last_used_at = datetime("now") WHERE id = ?'
    ).bind(result.id).run();
    return true;
  }

  if (env.ADMIN_API_KEY && token === env.ADMIN_API_KEY) return true;

  return false;
}

// ============ Email (Resend) ============

/**
 * Send license key to customer via Resend (100 free emails/day).
 * Requires RESEND_API_KEY set as Cloudflare Worker secret.
 */
async function sendLicenseEmail(toEmail, licenseKey, env) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured — skipping email');
    return 'skipped: no api key';
  }

  const htmlBody = `<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #6366F1;">Thank you for upgrading to ClearJSON Pro!</h2>
  <p>Your lifetime license key is ready:</p>
  <div style="background: #eef2ff; border: 2px solid #6366F1; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
    <code style="font-size: 22px; font-weight: bold; letter-spacing: 2px;">${licenseKey}</code>
  </div>
  <p><strong>How to activate:</strong></p>
  <ol>
    <li>Click the ClearJSON icon in your Chrome toolbar</li>
    <li>Go to <strong>Settings</strong></li>
    <li>Enter the license key and click <strong>Activate</strong></li>
  </ol>
  <p>This key covers <strong>3 devices</strong> with lifetime access. No subscription, no recurring charges.</p>
  <p style="color: #888; font-size: 13px; margin-top: 32px;">Need help? Reply to this email or contact <a href="mailto:support@wayknow.tech">support@wayknow.tech</a>.</p>
</body></html>`;

  const textBody = `Thank you for upgrading to ClearJSON Pro!

Your lifetime license key: ${licenseKey}

How to activate:
1. Click the ClearJSON icon in your Chrome toolbar
2. Go to Settings
3. Enter the license key and click Activate

This key covers 3 devices with lifetime access.

Need help? Contact support@wayknow.tech`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'ClearJSON <noreply@wayknow.tech>',
        to: [toEmail],
        subject: 'Your ClearJSON Pro License Key',
        html: htmlBody,
        text: textBody,
      }),
    });

    const resBody = await response.text();
    if (response.ok) {
      console.log(`Email sent OK: ${licenseKey} -> ${toEmail}`);
      return `sent: ${response.status}`;
    } else {
      console.error(`Email failed (${response.status}): ${resBody.slice(0, 500)}`);
      return `failed: ${response.status} ${resBody.slice(0, 200)}`;
    }
  } catch (err) {
    console.error('Email send error:', err.message);
    return `error: ${err.message}`;
  }
}

// ============ Endpoints ============

async function handleVerify(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!checkRateLimit(ip)) {
    return json({ valid: false, error: 'rate_limited' }, 429);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ valid: false, error: 'invalid_json' }, 400);
  }

  const { license_key, device_id, device_name } = body;
  if (!license_key || typeof license_key !== 'string') {
    return json({ valid: false, error: 'missing_license_key' }, 400);
  }
  if (!device_id || typeof device_id !== 'string') {
    return json({ valid: false, error: 'missing_device_id' }, 400);
  }

  const keyRegex = new RegExp(`^${KEY_PREFIX}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$`);
  if (!keyRegex.test(license_key)) {
    return json({ valid: false, error: 'invalid_format' });
  }

  const license = await env.DB.prepare(
    'SELECT license_key, email, status, tier, max_devices, created_at, expires_at FROM licenses WHERE license_key = ?'
  ).bind(license_key).first();

  if (!license) {
    return json({ valid: false, error: 'not_found' });
  }

  if (license.status !== 'active') {
    return json({ valid: false, error: license.status === 'revoked' ? 'revoked' : 'expired' });
  }

  if (license.expires_at) {
    const expires = new Date(license.expires_at + 'Z');
    if (expires < new Date()) {
      await env.DB.prepare(
        'UPDATE licenses SET status = ? WHERE license_key = ?'
      ).bind('expired', license_key).run();
      return json({ valid: false, error: 'expired' });
    }
  }

  const existingActivation = await env.DB.prepare(
    'SELECT id, device_id FROM activations WHERE license_key = ? AND device_id = ?'
  ).bind(license_key, device_id).first();

  if (existingActivation) {
    await env.DB.prepare(
      'UPDATE activations SET last_seen_at = datetime("now"), device_name = ? WHERE id = ?'
    ).bind(device_name || '', existingActivation.id).run();
  } else {
    const activationCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM activations WHERE license_key = ?'
    ).bind(license_key).first();

    if (activationCount.count >= license.max_devices) {
      return json({
        valid: false,
        error: 'device_limit_reached',
        activations: activationCount.count,
        max_devices: license.max_devices,
      });
    }

    await env.DB.prepare(
      'INSERT INTO activations (license_key, device_id, device_name) VALUES (?, ?, ?)'
    ).bind(license_key, device_id, device_name || '').run();
  }

  const currentActivations = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM activations WHERE license_key = ?'
  ).bind(license_key).first();

  return json({
    valid: true,
    tier: license.tier,
    email: license.email,
    activations: currentActivations.count,
    max_devices: license.max_devices,
    created_at: license.created_at,
    expires_at: license.expires_at,
  });
}

async function handleGenerate(request, env) {
  if (!(await authenticate(request, env))) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const { email, count } = body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return json({ error: 'invalid_email' }, 400);
  }

  const keyCount = Math.min(Math.max(count || 1, 1), 10);
  const keys = [];

  for (let i = 0; i < keyCount; i++) {
    let key, attempts = 0;
    do {
      key = generateLicenseKey();
      attempts++;
    } while (
      attempts < 5 &&
      await env.DB.prepare('SELECT id FROM licenses WHERE license_key = ?').bind(key).first()
    );

    if (attempts >= 5) {
      return json({ error: 'key_generation_failed', generated: keys }, 500);
    }

    await env.DB.prepare(
      'INSERT INTO licenses (license_key, email, tier, max_devices) VALUES (?, ?, ?, ?)'
    ).bind(key, email, 'pro', MAX_DEVICES).run();

    keys.push(key);
  }

  return json({ keys, email, count: keys.length }, 201);
}

// ============ Creem Webhook ============

async function verifyCreemSignature(request, rawBody, env) {
  const signature = request.headers.get('creem-signature') || '';
  const webhookSecret = env.CREEM_WEBHOOK_SECRET;

  if (!webhookSecret) {
    // No secret configured — skip verification (development)
    return true;
  }

  if (!signature) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const expected = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return expected === signature;
  } catch (err) {
    console.error('Signature verification error:', err.message);
    return false;
  }
}

async function handleCreemWebhook(request, env) {
  const rawBody = await request.text();

  // Verify HMAC-SHA256 signature
  const sigValid = await verifyCreemSignature(request, rawBody, env);
  if (!sigValid) {
    const sigHeader = request.headers.get('creem-signature') || '';
    console.error(`Webhook signature mismatch. Header: ${sigHeader.slice(0, 16)}..., Secret configured: ${!!env.CREEM_WEBHOOK_SECRET}`);
    return json({ error: 'invalid_signature' }, 401);
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const eventType = body.eventType;
  const obj = body.object || {};

  if (eventType !== 'checkout.completed') {
    return json({ received: true, action: 'ignored', event: eventType });
  }

  const email = obj.customer?.email;
  if (!email) {
    return json({ error: 'missing_customer_email' }, 400);
  }

  const orderId = obj.order?.id;
  if (orderId) {
    const existing = await env.DB.prepare(
      'SELECT license_key FROM licenses WHERE creem_order_id = ?'
    ).bind(orderId).first();
    if (existing) {
      return json({ received: true, action: 'already_issued', license_key: existing.license_key });
    }
  }

  const key = generateLicenseKey();
  await env.DB.prepare(
    `INSERT INTO licenses (license_key, email, tier, max_devices, creem_customer_id, creem_order_id)
     VALUES (?, ?, 'pro', ?, ?, ?)`
  ).bind(key, email, MAX_DEVICES, obj.customer?.id || null, orderId || null).run();

  console.log(`License issued: ${key} -> ${email} (order: ${orderId || 'N/A'})`);

  // Send license key via email
  await sendLicenseEmail(email, key, env);

  return json({
    received: true,
    action: 'license_issued',
    license_key: key,
    email,
  }, 201);
}

function handleCheckoutPro(env) {
  return json({
    product: 'ClearJSON Pro',
    price: '$29.00',
    url: CREEM_CHECKOUT_URL,
  });
}

// ============ Admin ============

async function handleAdminList(request, env) {
  if (!(await authenticate(request, env))) {
    return json({ error: 'unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let licenses, total;
  if (email) {
    total = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM licenses WHERE email LIKE ?'
    ).bind(`%${email}%`).first();
    licenses = await env.DB.prepare(
      `SELECT l.*, (SELECT COUNT(*) FROM activations a WHERE a.license_key = l.license_key) as activation_count
       FROM licenses l WHERE l.email LIKE ?
       ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
    ).bind(`%${email}%`, limit, offset).all();
  } else {
    total = await env.DB.prepare('SELECT COUNT(*) as count FROM licenses').first();
    licenses = await env.DB.prepare(
      `SELECT l.*, (SELECT COUNT(*) FROM activations a WHERE a.license_key = l.license_key) as activation_count
       FROM licenses l
       ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();
  }

  return json({
    licenses: licenses.results,
    total: total.count,
    limit,
    offset,
  });
}

// ============ Router ============

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname;
    const method = request.method.toUpperCase();

    if (path.startsWith('/clearjson')) {
      path = path.replace('/clearjson', '') || '/';
    }

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      if (method === 'POST' && path === '/api/license/verify') {
        return await handleVerify(request, env);
      }
      if (method === 'POST' && path === '/api/license/generate') {
        return await handleGenerate(request, env);
      }
      if (method === 'POST' && path === '/api/webhook/creem') {
        return await handleCreemWebhook(request, env);
      }
      if (method === 'GET' && path === '/api/checkout/pro') {
        return handleCheckoutPro(env);
      }
      if (method === 'GET' && path === '/api/admin/licenses') {
        return await handleAdminList(request, env);
      }

      if (method === 'GET' && (path === '/' || path === '/api/health')) {
        return json({ status: 'ok', version: '1.0.0', service: 'clearjson-license', timestamp: new Date().toISOString() });
      }

      return json({ error: 'not_found' }, 404);
    } catch (err) {
      console.error('Unhandled error:', err.message);
      return json({ error: 'internal_error', message: err.message }, 500);
    }
  },
};
