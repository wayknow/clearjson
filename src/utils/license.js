/**
 * ClearJSON Pro License System
 *
 * Validates a license key against the ClearJSON license server.
 * Falls back to offline format validation when server is unreachable.
 *
 * Key format: CLJ-XXXX-XXXX-XXXX
 * Server: Cloudflare Worker + D1 (see ../server/)
 *
 * Pro features gated behind this:
 *   - Large file virtual scrolling (>2MB)
 *   - Advanced search (regex)
 *   - JWT decode
 *   - CSV / TSV / YAML export
 *   - 20 additional themes
 *   - Custom keyboard shortcuts
 */

var ClearJSON = window.ClearJSON || {};

(function (C) {
  'use strict';

  // ================================================================
  //  CONFIGURATION
  // ================================================================

  var LICENSE_API_BASE = 'https://api.wayknow.tech/clearjson';
  var CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  var REQUEST_TIMEOUT_MS = 8000;
  var KEY_PREFIX = 'CLJ';
  var KEY_REGEX = /^CLJ-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

  var PRO_FEATURES = [
    'largeFiles',
    'advancedSearch',
    'jwtDecode',
    'csvExport',
    'proThemes',
    'customShortcuts'
  ];

  // ================================================================
  //  DEVICE ID
  // ================================================================

  function getDeviceId() {
    try {
      var raw = localStorage.getItem('clearjson_device_id');
      if (raw) return raw;
      var id = 'clj-' + crypto.randomUUID();
      localStorage.setItem('clearjson_device_id', id);
      return id;
    } catch (e) {
      return 'clj-unknown';
    }
  }

  function getDeviceName() {
    var ua = navigator.userAgent;
    var isMac = ua.indexOf('Mac') !== -1;
    var isWin = ua.indexOf('Windows') !== -1;
    var isLinux = ua.indexOf('Linux') !== -1 && ua.indexOf('Android') === -1;
    var os = isMac ? 'macOS' : isWin ? 'Windows' : isLinux ? 'Linux' : 'Unknown';
    var chromeMatch = ua.match(/Chrome\/(\d+)/);
    var chromeVer = chromeMatch ? 'Chrome ' + chromeMatch[1] : 'Chrome';
    return os + ' · ' + chromeVer;
  }

  // ================================================================
  //  ONLINE VERIFICATION
  // ================================================================

  function verifyOnline(key, timeout) {
    timeout = timeout || REQUEST_TIMEOUT_MS;
    var deviceId = getDeviceId();

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeout);

    return fetch(LICENSE_API_BASE + '/api/license/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: key,
        device_id: deviceId,
        device_name: getDeviceName()
      }),
      signal: controller.signal
    })
      .then(function (response) {
        clearTimeout(timer);
        if (!response.ok) {
          console.warn('License server returned', response.status, '— falling back to offline');
          return { valid: isValidFormat(key), tier: isValidFormat(key) ? 'pro' : null, offline: true };
        }
        return response.json().then(function (data) {
          data.offline = false;
          return data;
        });
      })
      .catch(function (err) {
        clearTimeout(timer);
        console.warn('License server unreachable — using offline validation:', err.message);
        return { valid: isValidFormat(key), tier: isValidFormat(key) ? 'pro' : null, offline: true, error: err.message };
      });
  }

  // ================================================================
  //  CACHED VERIFICATION
  // ================================================================

  function getCachedVerification() {
    try {
      var raw = localStorage.getItem('clearjson_license_verification');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function setCachedVerification(key, result) {
    try {
      var cache = {
        license_key: key,
        valid: result.valid,
        tier: result.tier,
        email: result.email,
        activations: result.activations,
        max_devices: result.max_devices,
        offline: result.offline,
        timestamp: Date.now()
      };
      localStorage.setItem('clearjson_license_verification', JSON.stringify(cache));
    } catch (e) {
      // localStorage unavailable
    }
  }

  function clearCachedVerification() {
    try { localStorage.removeItem('clearjson_license_verification'); } catch (e) {}
  }

  // ================================================================
  //  VALIDATION
  // ================================================================

  function isValidFormat(key) {
    if (!key || typeof key !== 'string') return false;
    return KEY_REGEX.test(key.trim().toUpperCase());
  }

  // ================================================================
  //  PUBLIC API
  // ================================================================

  /**
   * Store a license key and verify it online.
   * Returns true if the key is accepted (online or offline fallback).
   */
  function storeLicense(key) {
    if (!key || typeof key !== 'string') return false;

    key = key.trim().toUpperCase();

    if (!isValidFormat(key)) return false;

    // Store locally immediately (so user sees instant feedback)
    var data = {
      key: key,
      activatedAt: Date.now(),
      version: '2.0'
    };

    try {
      localStorage.setItem('clearjson_pro_license', JSON.stringify(data));
    } catch (e) {
      // localStorage unavailable
    }

    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ clearjson_pro: data });
    }

    // Verify online in background (fire-and-forget)
    verifyOnline(key).then(function (result) {
      setCachedVerification(key, result);
      if (result.valid && !result.offline) {
        console.log('ClearJSON Pro: verified online —', result.email || 'lifetime');
      } else if (result.valid && result.offline) {
        console.log('ClearJSON Pro: activated offline (server unreachable)');
      } else {
        console.warn('ClearJSON Pro: license rejected by server:', result.error);
        // If server explicitly rejects, remove local license
        if (!result.offline) {
          removeLicense();
          console.warn('ClearJSON Pro: license removed — server rejected key');
        }
      }
    });

    return true;
  }

  /**
   * Check if Pro is currently active.
   * Uses cached verification if fresh, otherwise re-verifies online.
   */
  function isActive() {
    // Dev mode: auto-enable Pro via localStorage flag, localhost:8765, or ?dev URL param
    try {
      if (localStorage.getItem('clearjson_pro_dev') === '1') return true;
      if (typeof window !== 'undefined' && window.location &&
          window.location.hostname === 'localhost' &&
          window.location.port === '8765') return true;
      if (typeof window !== 'undefined' && window.location &&
          window.location.search.indexOf('dev') !== -1) return true;
    } catch (e) { /* ignore */ }

    // Check if a license is stored
    try {
      var raw = localStorage.getItem('clearjson_pro_license');
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || !data.key) return false;
    } catch (e) {
      return false;
    }

    // Check cached verification first
    var cached = getCachedVerification();
    if (cached && cached.license_key === data.key) {
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.valid === true;
      }
    }

    // Cache expired or missing — re-verify in background
    // For this call, return the cached value or assume valid format
    verifyOnline(data.key).then(function (result) {
      setCachedVerification(data.key, result);
      if (!result.valid && !result.offline) {
        // Server explicitly rejected — remove license
        removeLicense();
        console.warn('ClearJSON Pro: license revoked by server');
      }
    });

    // Return cached value if available, otherwise optimistic
    if (cached && cached.license_key === data.key) {
      return cached.valid === true;
    }
    // First time: optimistic — accept valid format
    return isValidFormat(data.key);
  }

  /**
   * Check if a specific Pro feature is available.
   */
  function hasFeature(featureName) {
    if (!isActive()) return false;
    return PRO_FEATURES.indexOf(featureName) !== -1;
  }

  /**
   * Get license info (for display).
   */
  function getInfo() {
    var info = { active: false, activatedAt: null, keyPreview: null, email: null, offline: false };

    try {
      var raw = localStorage.getItem('clearjson_pro_license');
      if (!raw) return info;
      var data = JSON.parse(raw);
      if (!data || !data.key) return info;

      var cached = getCachedVerification();
      var active = isActive();

      info.active = active;
      info.activatedAt = data.activatedAt || null;
      info.keyPreview = maskKey(data.key);

      if (cached && cached.license_key === data.key) {
        info.email = cached.email || null;
        info.activations = cached.activations || 0;
        info.maxDevices = cached.max_devices || 3;
        info.offline = cached.offline || false;
      }
    } catch (e) { /* ignore */ }

    return info;
  }

  function maskKey(key) {
    if (!key) return null;
    var parts = key.split('-');
    if (parts.length === 4) {
      return 'CLJ-****-****-' + parts[3];
    }
    return key.substring(0, 7) + '****';
  }

  /**
   * Remove license (deactivate).
   */
  function removeLicense() {
    try { localStorage.removeItem('clearjson_pro_license'); } catch (e) {}
    clearCachedVerification();
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove('clearjson_pro');
    }
  }

  // ================================================================
  //  KEY GENERATOR (development only)
  // ================================================================

  function generateDevKey() {
    // This generates a valid-format key for local testing.
    // It will NOT pass online verification — use the dev bypass instead:
    //   localStorage.setItem('clearjson_pro_dev', '1')
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var segments = [];
    for (var s = 0; s < 3; s++) {
      var seg = '';
      for (var i = 0; i < 4; i++) {
        seg += chars[Math.floor(Math.random() * chars.length)];
      }
      segments.push(seg);
    }
    return 'CLJ-' + segments.join('-');
  }

  C.License = {
    storeLicense: storeLicense,
    isActive: isActive,
    hasFeature: hasFeature,
    getInfo: getInfo,
    removeLicense: removeLicense,
    generateDevKey: generateDevKey,
    PRO_FEATURES: PRO_FEATURES
  };
})(ClearJSON);
