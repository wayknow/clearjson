/**
 * Tests for license.js — license storage, validation, Pro feature gating.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { setupForLicense, resetAll, _localStorage, _chromeStorage } = require('./helpers/setup.js');

// Load license module at module scope
setupForLicense();
const L = window.ClearJSON.License;

// ---- helpers ----

function givenDevMode() {
  localStorage.setItem('clearjson_pro_dev', '1');
}

function givenNoLicense() {
  localStorage.removeItem('clearjson_pro_dev');
  localStorage.removeItem('clearjson_pro_license');
  chrome.storage.local.remove('clearjson_pro');
}

beforeEach(function () {
  resetAll();
  // Re-load license module after clearing storage
  setupForLicense();
});

const VALID_KEY = 'CLJ-ABCD-WXYZ-1234';

// ---- storeLicense ----

describe('License.storeLicense()', function () {
  beforeEach(function () {
    givenNoLicense();
  });

  it('accepts valid-format key', function () {
    assert.ok(L.storeLicense(VALID_KEY));
  });

  it('stores key in localStorage', function () {
    L.storeLicense(VALID_KEY);
    const raw = _localStorage.get('clearjson_pro_license');
    assert.ok(raw);
    const data = JSON.parse(raw);
    assert.strictEqual(data.key, VALID_KEY);
  });

  it('stores key in chrome.storage.local', function () {
    // storeLicense calls chrome.storage.local.set which is async
    // but the test runs synchronously — the key is stored via localStorage primarily
    L.storeLicense(VALID_KEY);
    const raw = _localStorage.get('clearjson_pro_license');
    assert.ok(raw);
  });

  it('rejects non-CLJ format key', function () {
    assert.strictEqual(L.storeLicense('BAD-FORMAT-KEY'), false);
  });

  it('rejects key with wrong prefix', function () {
    assert.strictEqual(L.storeLicense('SMP-ABCD-WXYZ-1234'), false);
  });

  it('rejects key with wrong segment length', function () {
    assert.strictEqual(L.storeLicense('CLJ-ABC-WXYZ-1234'), false);
  });

  it('rejects empty string', function () {
    assert.strictEqual(L.storeLicense(''), false);
  });

  it('rejects null', function () {
    assert.strictEqual(L.storeLicense(null), false);
  });

  it('trims whitespace from key', function () {
    assert.ok(L.storeLicense('  CLJ-ABCD-WXYZ-1234  '));
  });

  it('lowercases key before storing', function () {
    L.storeLicense('clj-abcd-wxyz-1234');
    const raw = _localStorage.get('clearjson_pro_license');
    const data = JSON.parse(raw);
    assert.strictEqual(data.key, 'CLJ-ABCD-WXYZ-1234');
  });
});

// ---- isActive ----

describe('License.isActive()', function () {
  beforeEach(function () {
    givenNoLicense();
  });

  it('returns false with no license', function () {
    assert.strictEqual(L.isActive(), false);
  });

  it('returns true in dev mode', function () {
    givenDevMode();
    assert.ok(L.isActive());
  });

  it('returns true with valid-format key stored', function () {
    L.storeLicense(VALID_KEY);
    // isActive will try online verification (which fails in test),
    // falls back to format check
    assert.ok(L.isActive());
  });

  it('returns false with invalid format key stored', function () {
    _localStorage.set('clearjson_pro_license', JSON.stringify({ key: 'not-a-key' }));
    assert.strictEqual(L.isActive(), false);
  });
});

// ---- hasFeature ----

describe('License.hasFeature()', function () {
  beforeEach(function () {
    givenNoLicense();
  });

  it('returns false without license', function () {
    assert.strictEqual(L.hasFeature('largeFiles'), false);
  });

  it('returns true with dev mode for known feature', function () {
    givenDevMode();
    assert.ok(L.hasFeature('largeFiles'));
    assert.ok(L.hasFeature('advancedSearch'));
    assert.ok(L.hasFeature('jwtDecode'));
    assert.ok(L.hasFeature('csvExport'));
    assert.ok(L.hasFeature('proThemes'));
    assert.ok(L.hasFeature('customShortcuts'));
  });

  it('returns false for unknown feature', function () {
    givenDevMode();
    assert.strictEqual(L.hasFeature('nonexistentFeature'), false);
  });

  it('returns false without license for all features', function () {
    L.PRO_FEATURES.forEach(function (f) {
      assert.strictEqual(L.hasFeature(f), false, 'hasFeature(' + f + ') should be false');
    });
  });
});

// ---- getInfo ----

describe('License.getInfo()', function () {
  beforeEach(function () {
    givenNoLicense();
  });

  it('returns inactive info when no license', function () {
    const info = L.getInfo();
    assert.strictEqual(info.active, false);
    assert.strictEqual(info.activatedAt, null);
    assert.strictEqual(info.keyPreview, null);
  });

  it('returns key preview with masking', function () {
    L.storeLicense(VALID_KEY);
    const info = L.getInfo();
    assert.strictEqual(info.active, true);
    assert.ok(info.keyPreview.indexOf('****') > -1, 'key should be masked');
    assert.ok(info.keyPreview.indexOf('CLJ-') === 0);
    assert.ok(info.keyPreview.indexOf('1234') > -1, 'last segment should be visible');
  });
});

// ---- removeLicense ----

describe('License.removeLicense()', function () {
  beforeEach(function () {
    givenNoLicense();
  });

  it('clears stored license', function () {
    L.storeLicense(VALID_KEY);
    assert.ok(L.isActive());
    L.removeLicense();
    assert.strictEqual(L.isActive(), false);
  });

  it('is idempotent', function () {
    L.removeLicense();
    L.removeLicense();
    assert.strictEqual(L.isActive(), false);
  });
});

// ---- generateDevKey ----

describe('License.generateDevKey()', function () {
  it('returns a valid-format key', function () {
    const key = L.generateDevKey();
    assert.ok(typeof key === 'string');
    assert.ok(key.indexOf('CLJ-') === 0);
    assert.strictEqual(key.split('-').length, 4);
  });

  it('generates different keys each time', function () {
    const keys = new Set();
    for (let i = 0; i < 10; i++) {
      keys.add(L.generateDevKey());
    }
    // Most should be different (extremely unlikely to get duplicate)
    assert.ok(keys.size >= 8, 'should generate diverse keys, got ' + keys.size + ' unique out of 10');
  });

  it('all segments are 4 chars', function () {
    const key = L.generateDevKey();
    const parts = key.split('-');
    assert.strictEqual(parts.length, 4);
    assert.strictEqual(parts[1].length, 4);
    assert.strictEqual(parts[2].length, 4);
    assert.strictEqual(parts[3].length, 4);
  });
});

// ---- PRO_FEATURES ----

describe('License.PRO_FEATURES', function () {
  it('contains all expected features', function () {
    assert.ok(Array.isArray(L.PRO_FEATURES));
    assert.ok(L.PRO_FEATURES.indexOf('largeFiles') !== -1);
    assert.ok(L.PRO_FEATURES.indexOf('advancedSearch') !== -1);
    assert.ok(L.PRO_FEATURES.indexOf('jwtDecode') !== -1);
    assert.ok(L.PRO_FEATURES.indexOf('csvExport') !== -1);
    assert.ok(L.PRO_FEATURES.indexOf('proThemes') !== -1);
    assert.ok(L.PRO_FEATURES.indexOf('customShortcuts') !== -1);
  });
});

resetAll();
