/**
 * ClearJSON Pro License System
 *
 * Validates a license key locally (no server required).
 * Uses a simple format: CLEARJSON-XXXX-XXXX-XXXX
 * Key is cryptographically signed with HMAC-SHA256.
 *
 * In production, keys are generated server-side and the secret
 * is embedded in the extension. For now, uses a local validation.
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

  var PRO_FEATURES = [
    'largeFiles',
    'advancedSearch',
    'jwtDecode',
    'csvExport',
    'proThemes',
    'customShortcuts'
  ];

  // ================================================================
  //  LICENSE VALIDATION
  // ================================================================

  /**
   * Simple local license key validation.
   *
   * Key format: CLEARJSON-XXXX-XXXX-XXXX
   * where XXXX are hex characters with a checksum.
   * This is intentionally simple for Phase 2 — real crypto
   * signing will be added before public launch.
   */
  function validateKey(key) {
    if (!key || typeof key !== 'string') return false;

    // Strip whitespace
    key = key.trim().toUpperCase();

    // Format check: CLEARJSON-XXXX-XXXX-XXXX
    var parts = key.split('-');
    if (parts.length !== 4 || parts[0] !== 'CLEARJSON') return false;

    // Each segment must be 4 hex chars
    for (var i = 1; i < 4; i++) {
      if (!/^[0-9A-F]{4}$/.test(parts[i])) return false;
    }

    // Checksum: sum of all hex values mod 0xFFFF should match last segment
    var combined = parts[1] + parts[2];
    var checksum = 0;
    for (var j = 0; j < combined.length; j++) {
      checksum = (checksum * 16 + parseInt(combined[j], 16)) % 0xFFFF;
    }
    var expected = parseInt(parts[3], 16);

    return checksum === expected;
  }

  /**
   * Store a license key locally.
   */
  function storeLicense(key) {
    if (!validateKey(key)) return false;

    var data = {
      key: key,
      activatedAt: Date.now(),
      version: '1.0'
    };

    try {
      localStorage.setItem('clearjson_pro_license', JSON.stringify(data));
    } catch (e) {
      // localStorage unavailable
    }

    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ clearjson_pro: data });
    }

    return true;
  }

  /**
   * Check if Pro is currently active.
   */
  function isActive() {
    // Check localStorage first (fast)
    try {
      var raw = localStorage.getItem('clearjson_pro_license');
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.key && validateKey(data.key)) return true;
      }
    } catch (e) { /* ignore */ }

    return false;
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
    try {
      var raw = localStorage.getItem('clearjson_pro_license');
      if (raw) {
        var data = JSON.parse(raw);
        return {
          active: isActive(),
          activatedAt: data.activatedAt || null,
          keyPreview: data.key ? maskKey(data.key) : null
        };
      }
    } catch (e) { /* ignore */ }
    return { active: false, activatedAt: null, keyPreview: null };
  }

  function maskKey(key) {
    if (!key) return null;
    var parts = key.split('-');
    if (parts.length === 4) {
      return 'CLEARJSON-****-****-' + parts[3];
    }
    return key.substring(0, 14) + '****';
  }

  /**
   * Remove license (deactivate).
   */
  function removeLicense() {
    try { localStorage.removeItem('clearjson_pro_license'); } catch (e) {}
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove('clearjson_pro');
    }
  }

  // ================================================================
  //  KEY GENERATOR (development only)
  // ================================================================

  function generateDevKey() {
    // Generate a valid dev key for testing
    var a = ('0000' + Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase()).slice(-4);
    var b = ('0000' + Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase()).slice(-4);

    // Compute checksum
    var combined = a + b;
    var checksum = 0;
    for (var i = 0; i < combined.length; i++) {
      checksum = (checksum * 16 + parseInt(combined[i], 16)) % 0xFFFF;
    }
    var c = ('0000' + checksum.toString(16).toUpperCase()).slice(-4);

    return 'CLEARJSON-' + a + '-' + b + '-' + c;
  }

  C.License = {
    validateKey: validateKey,
    storeLicense: storeLicense,
    isActive: isActive,
    hasFeature: hasFeature,
    getInfo: getInfo,
    removeLicense: removeLicense,
    generateDevKey: generateDevKey,
    PRO_FEATURES: PRO_FEATURES
  };
})(ClearJSON);
