/**
 * ClearJSON License Server — Cloudflare Worker
 *
 * Endpoints:
 *   POST /api/license/verify       — Public: validate a license key + device binding
 *   POST /api/license/generate     — Admin: generate license key(s)
 *   POST /api/webhook/creem        — Creem payment webhook → auto-generate key
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

// Simple rate limiter
function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  // Cleanup old entries periodically
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

  // Check against stored tokens in D1
  const result = await env.DB.prepare(
    'SELECT id FROM api_tokens WHERE token_hash = ?'
  ).bind(tokenHash).first();

  if (result) {
    // Update last_used_at
    await env.DB.prepare(
      'UPDATE api_tokens SET last_used_at = datetime("now") WHERE id = ?'
    ).bind(result.id).run();
    return true;
  }

  // Also check against ADMIN_API_KEY secret for initial setup
  if (env.ADMIN_API_KEY && token === env.ADMIN_API_KEY) return true;

  return false;
}

// ============ Endpoints ============

/**
 * POST /api/license/verify
 * Body: { license_key, device_id, device_name? }
 * Response: { valid, tier, email?, activations?, max_devices?, error? }
 */
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

  // --- Validate format ---
  const keyRegex = new RegExp(`^${KEY_PREFIX}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$`);
  if (!keyRegex.test(license_key)) {
    return json({ valid: false, error: 'invalid_format' });
  }

  // --- Look up license ---
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
      // Auto-expire
      await env.DB.prepare(
        'UPDATE licenses SET status = ? WHERE license_key = ?'
      ).bind('expired', license_key).run();
      return json({ valid: false, error: 'expired' });
    }
  }

  // --- Check / upsert device activation ---
  const existingActivation = await env.DB.prepare(
    'SELECT id, device_id FROM activations WHERE license_key = ? AND device_id = ?'
  ).bind(license_key, device_id).first();

  if (existingActivation) {
    // Already activated on this device — update last_seen_at
    await env.DB.prepare(
      'UPDATE activations SET last_seen_at = datetime("now"), device_name = ? WHERE id = ?'
    ).bind(device_name || '', existingActivation.id).run();
  } else {
    // New device — check activation limit
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

    // Activate new device
    await env.DB.prepare(
      'INSERT INTO activations (license_key, device_id, device_name) VALUES (?, ?, ?)'
    ).bind(license_key, device_id, device_name || '').run();
  }

  // --- Count current activations ---
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

/**
 * POST /api/license/generate
 * Auth: Bearer <token>
 * Body: { email, count? (default 1, max 10) }
 * Response: { keys: [...] }
 */
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
    // Retry on collision (extremely unlikely but guard it)
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
    ).bind(key, email, 'pro', 3).run();

    keys.push(key);
  }

  return json({ keys, email, count: keys.length }, 201);
}

/**
 * POST /api/webhook/creem
 * Receives payment notification from Creem, auto-generates license key.
 *
 * Creem webhook payload (simplified):
 * {
 *   "event": "order.completed",
 *   "data": {
 *     "id": "order_xxx",
 *     "customer": { "email": "user@example.com", "id": "cust_xxx" },
 *     "product": { "id": "prod_xxx" }
 *   }
 * }
 *
 * Headers: creem-signature: t=<timestamp>,s=<signature>
 * Verification: HMAC-SHA256(creem_webhook_secret, body)
 */
async function handleCreemWebhook(request, env) {
  // TODO: Add Creem webhook signature verification before production.
  // const signature = request.headers.get('creem-signature');
  // const body = await request.text();
  // ... HMAC-SHA256 verify using env.CREEM_WEBHOOK_SECRET ...

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const event = body.event;
  const data = body.data || {};

  // Only handle completed orders
  if (event !== 'order.completed') {
    return json({ received: true, action: 'ignored', event });
  }

  const email = data.customer?.email;
  if (!email) {
    return json({ error: 'missing_customer_email' }, 400);
  }

  // Check if we already issued a license for this order (idempotency)
  const orderId = data.id;
  if (orderId) {
    const existing = await env.DB.prepare(
      'SELECT license_key FROM licenses WHERE creem_order_id = ?'
    ).bind(orderId).first();
    if (existing) {
      return json({ received: true, action: 'already_issued', license_key: existing.license_key });
    }
  }

  // Generate license key
  const key = generateLicenseKey();
  await env.DB.prepare(
    `INSERT INTO licenses (license_key, email, tier, max_devices, creem_customer_id, creem_order_id)
     VALUES (?, ?, 'pro', 3, ?, ?)`
  ).bind(key, email, data.customer?.id || null, orderId || null).run();

  // TODO: Send email to customer with their license key
  // Options: Resend, SendGrid, Mailchannels (free on Cloudflare), etc.

  console.log(`License issued: ${key} → ${email} (order: ${orderId || 'N/A'})`);

  return json({
    received: true,
    action: 'license_issued',
    license_key: key,
    email,
  }, 201);
}

/**
 * GET /api/admin/licenses
 * Auth: Bearer <token>
 * Query: ?email= (optional filter), ?limit=50 (default), ?offset=0
 * Response: { licenses: [...], total, limit, offset }
 */
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

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Strip path prefix if present (for custom domain routing: api.wayknow.tech/clearjson/*)
    if (path.startsWith('/clearjson')) {
      path = path.replace('/clearjson', '') || '/';
    }

    try {
      // Route matching
      if (method === 'POST' && path === '/api/license/verify') {
        return await handleVerify(request, env);
      }
      if (method === 'POST' && path === '/api/license/generate') {
        return await handleGenerate(request, env);
      }
      if (method === 'POST' && path === '/api/webhook/creem') {
        return await handleCreemWebhook(request, env);
      }
      if (method === 'GET' && path === '/api/admin/licenses') {
        return await handleAdminList(request, env);
      }

      // Health check
      if (method === 'GET' && (path === '/' || path === '/api/health')) {
        return json({ status: 'ok', version: '1.0.0', service: 'clearjson-license', timestamp: new Date().toISOString() });
      }

      // 404
      return json({ error: 'not_found' }, 404);
    } catch (err) {
      console.error('Unhandled error:', err.message);
      return json({ error: 'internal_error', message: err.message }, 500);
    }
  },
};
