/**
 * ClearJSON MCP License System — Node.js edition.
 *
 * Validates a license key against the ClearJSON license server.
 * Same API and key format as the Chrome extension.
 *
 * Key format: CLJ-XXXX-XXXX-XXXX
 * Server: Cloudflare Worker + D1 (POST api.wayknow.tech/clearjson/api/license/verify)
 * Cache: 7 days, stored in ~/.clearjson/license.json
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

// ─── Configuration ─────────────────────────────────

const LICENSE_API = 'https://api.wayknow.tech/clearjson/api/license/verify';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REQUEST_TIMEOUT_MS = 8000;
const KEY_PREFIX = 'CLJ';
const KEY_REGEX = /^CLJ-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

const PRO_FEATURES = ['query_json', 'diff_json', 'convert_json'];

// ─── Storage ───────────────────────────────────────

function getConfigDir() {
  const dir = path.join(os.homedir(), '.clearjson');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getLicensePath() {
  return path.join(getConfigDir(), 'license.json');
}

function readLicense() {
  try {
    const raw = fs.readFileSync(getLicensePath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLicense(data) {
  try {
    fs.writeFileSync(getLicensePath(), JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    // silent — permission denied on the config dir
  }
}

function getDeviceId() {
  const configPath = path.join(getConfigDir(), 'device.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data.deviceId) return data.deviceId;
    }
  } catch {}

  const id = 'clj-mcp-' + crypto.randomUUID();
  try {
    fs.writeFileSync(configPath, JSON.stringify({ deviceId: id }), 'utf8');
  } catch {}
  return id;
}

function getDeviceName() {
  const platform = os.platform(); // darwin, linux, win32
  const osName = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Linux';
  return osName + ' · Node.js ' + process.version;
}

// ─── Validation ────────────────────────────────────

function isValidFormat(key) {
  if (!key || typeof key !== 'string') return false;
  return KEY_REGEX.test(key.trim().toUpperCase());
}

// ─── Online Verification ───────────────────────────

async function verifyOnline(key) {
  const deviceId = getDeviceId();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(LICENSE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: key,
        device_id: deviceId,
        device_name: getDeviceName()
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      return { valid: isValidFormat(key), tier: 'pro', offline: true };
    }

    const data = await response.json();
    data.offline = false;
    return data;
  } catch (err) {
    clearTimeout(timer);
    return { valid: isValidFormat(key), tier: 'pro', offline: true, error: err.message };
  }
}

// ─── Caching ───────────────────────────────────────

function getCachedVerification() {
  const license = readLicense();
  if (!license || !license.cache) return null;

  const c = license.cache;
  if (Date.now() - c.timestamp >= CACHE_TTL_MS) return null; // expired
  return c;
}

function setCachedVerification(key, result) {
  const license = readLicense() || {};
  license.key = key;
  license.activatedAt = license.activatedAt || Date.now();
  license.cache = {
    valid: result.valid,
    tier: result.tier,
    email: result.email,
    activations: result.activations,
    max_devices: result.max_devices,
    offline: result.offline,
    timestamp: Date.now()
  };
  writeLicense(license);
}

// ─── Public API ────────────────────────────────────

/**
 * Store and verify a license key.
 */
export async function activate(key) {
  if (!key || typeof key !== 'string') {
    return { ok: false, error: 'License key is required.' };
  }

  key = key.trim().toUpperCase();

  if (!isValidFormat(key)) {
    return { ok: false, error: 'Invalid key format. Expected: CLJ-XXXX-XXXX-XXXX' };
  }

  // Store locally immediately
  const license = readLicense() || {};
  license.key = key;
  license.activatedAt = Date.now();
  writeLicense(license);

  // Verify online
  const result = await verifyOnline(key);
  setCachedVerification(key, result);

  if (result.valid && !result.offline) {
    return { ok: true, email: result.email, offline: false };
  } else if (result.valid && result.offline) {
    return { ok: true, email: null, offline: true, warning: 'Server unreachable — activated offline. Will retry on next check.' };
  } else {
    // Server explicitly rejected — remove license
    try { fs.unlinkSync(getLicensePath()); } catch {}
    return { ok: false, error: 'License rejected by server: ' + (result.error || 'invalid key') };
  }
}

/**
 * Check if Pro is active.
 */
export function isActive() {
  // Dev mode
  if (process.env.CLEARJSON_PRO_DEV === '1') return true;

  const license = readLicense();
  if (!license || !license.key) return false;

  // Check cache first
  const cached = getCachedVerification();
  if (cached && cached.license_key === license.key) {
    return cached.valid === true;
  }

  // Cache expired — trigger background re-verify for next time
  verifyOnline(license.key).then(result => {
    setCachedVerification(license.key, result);
    if (!result.valid && !result.offline) {
      try { fs.unlinkSync(getLicensePath()); } catch {}
    }
  });

  // Optimistic: accept valid format
  return isValidFormat(license.key);
}

/**
 * Check if a specific Pro feature is available.
 */
export function hasFeature(featureName) {
  if (!isActive()) return false;
  return PRO_FEATURES.includes(featureName);
}

/**
 * Get license info for display.
 */
export function getInfo() {
  const license = readLicense();
  if (!license || !license.key) {
    return { active: false, activatedAt: null, keyPreview: null, email: null, offline: false };
  }

  const cached = getCachedVerification();
  const active = isActive();

  return {
    active,
    activatedAt: license.activatedAt || null,
    keyPreview: maskKey(license.key),
    email: cached?.email || null,
    activations: cached?.activations || 0,
    maxDevices: cached?.max_devices || 3,
    offline: cached?.offline || false
  };
}

/**
 * Remove license.
 */
export function removeLicense() {
  try { fs.unlinkSync(getLicensePath()); } catch {}
}

/**
 * Get the list of Pro-gated tool names.
 */
export function getProFeatures() {
  return PRO_FEATURES.slice();
}

function maskKey(key) {
  if (!key) return null;
  const parts = key.split('-');
  if (parts.length === 4) {
    return 'CLJ-****-****-' + parts[parts.length - 1];
  }
  return key.substring(0, 7) + '****';
}
