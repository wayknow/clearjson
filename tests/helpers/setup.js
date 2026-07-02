/**
 * Test environment setup for ClearJSON unit tests.
 *
 * Mocks browser APIs (window, localStorage, chrome.storage, DOM, crypto)
 * and loads the ClearJSON module system in manifest order.
 *
 * Usage:
 *   require('./tests/helpers/setup.js');
 *   // Now window.ClearJSON.* modules are available
 */

'use strict';

// ---- Browser globals ----

// In Node 26+, navigator is a getter-only property. Use defineProperty to override.
Object.defineProperty(global, 'window', { value: global, writable: true, configurable: true });
global.window = global;
window.ClearJSON = {};

// atob / btoa (Node 18+ has them, but ensure they're available)
if (typeof global.atob === 'undefined') {
  global.atob = function (s) { return Buffer.from(s, 'base64').toString('utf8'); };
}
if (typeof global.btoa === 'undefined') {
  global.btoa = function (s) { return Buffer.from(s).toString('base64'); };
}

// navigator (Node 26+ has a getter-only navigator global)
try {
  Object.defineProperty(global, 'navigator', { value: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  }, writable: true, configurable: true });
} catch (e) {
  global.navigator = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  };
}

// crypto (Node 19+ has globalThis.crypto, but ensure randomUUID works)
if (typeof global.crypto === 'undefined') {
  global.crypto = require('node:crypto').webcrypto;
}

// ---- localStorage mock ----

const _localStorage = new Map();
global.localStorage = {
  getItem: function (key) { return _localStorage.get(key) || null; },
  setItem: function (key, val) { _localStorage.set(key, String(val)); },
  removeItem: function (key) { _localStorage.delete(key); },
  clear: function () { _localStorage.clear(); },
  get length() { return _localStorage.size; },
  key: function (i) { return Array.from(_localStorage.keys())[i] || null; }
};

// ---- chrome.storage.local mock ----

const _chromeStorage = new Map();
global.chrome = {
  storage: {
    local: {
      get: async function (keys) {
        if (typeof keys === 'string') {
          return { [keys]: _chromeStorage.get(keys) || null };
        }
        if (Array.isArray(keys)) {
          const result = {};
          keys.forEach(function (k) { result[k] = _chromeStorage.get(k) || null; });
          return result;
        }
        if (keys === null || keys === undefined) {
          const result = {};
          _chromeStorage.forEach(function (v, k) { result[k] = v; });
          return result;
        }
        // keys is an object with default values
        const result = { ...keys };
        Object.keys(keys).forEach(function (k) {
          if (_chromeStorage.has(k)) result[k] = _chromeStorage.get(k);
        });
        return result;
      },
      set: async function (items) {
        Object.keys(items).forEach(function (k) { _chromeStorage.set(k, items[k]); });
      },
      remove: async function (keys) {
        if (typeof keys === 'string') {
          _chromeStorage.delete(keys);
        } else if (Array.isArray(keys)) {
          keys.forEach(function (k) { _chromeStorage.delete(k); });
        }
      },
      clear: async function () { _chromeStorage.clear(); }
    }
  }
};

// ---- DOM helpers ----

// Minimal AbortController (Node 15+ has it globally)
if (typeof global.AbortController === 'undefined') {
  global.AbortController = require('node:abort_controller').AbortController;
}

// fetch mock (basic — tests that need fetch should mock it themselves)
if (typeof global.fetch === 'undefined') {
  global.fetch = function () {
    return Promise.reject(new Error('fetch not implemented in test — mock it'));
  };
}

// ---- Module loader ----

const fs = require('fs');
const path = require('path');

function loadModule(filename) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', '..', 'src', 'utils', filename),
    'utf8'
  );
  eval(source);
}

/**
 * Load a module by name. Follows the manifest loading order.
 * Only loads each module once.
 */
const _loaded = new Set();
function requireModule(name) {
  if (_loaded.has(name)) return;
  _loaded.add(name);

  // Ensure dependencies are loaded first
  const deps = {
    'parser.js': [],
    'tokenizer.js': [],
    'themes.js': [],
    'license.js': [],
    'export.js': [],
    'jwt.js': ['license.js'],
    'stream-parser.js': [],
    'virtual-tree.js': ['tokenizer.js'],
    'tree.js': ['tokenizer.js', 'jwt.js'],
  };

  (deps[name] || []).forEach(function (dep) {
    requireModule(dep);
  });

  loadModule(name);
}

// Load commonly-used modules for most tests
function setupForParser()      { requireModule('parser.js'); }
function setupForTokenizer()   { requireModule('tokenizer.js'); }
function setupForLicense()     { requireModule('license.js'); }
function setupForExport()      { requireModule('export.js'); }
function setupForJWT()         { requireModule('jwt.js'); }

// Reset everything for a clean slate
function resetAll() {
  _localStorage.clear();
  _chromeStorage.clear();
  _loaded.clear();
}

// Export helpers
module.exports = {
  requireModule,
  setupForParser,
  setupForTokenizer,
  setupForLicense,
  setupForExport,
  setupForJWT,
  resetAll,
  _localStorage,
  _chromeStorage,
};
