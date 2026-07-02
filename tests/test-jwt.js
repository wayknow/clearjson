/**
 * Tests for jwt.js — JWT detection, decoding, and rendering.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { setupForJWT, resetAll, _localStorage } = require('./helpers/setup.js');

// Load JWT module (license loaded as dependency)
setupForJWT();
const J = window.ClearJSON.JWT;

// Helper to set Pro mode
function enablePro() {
  localStorage.setItem('clearjson_pro_dev', '1');
}

function disablePro() {
  localStorage.removeItem('clearjson_pro_dev');
  localStorage.removeItem('clearjson_pro_license');
}

const VALID_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.signature_part_here';

const EXPIRED_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0IiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjEwMDAwMDB9.sig';

// ---- isJWT ----

beforeEach(function () {
  // Enable Pro for most tests
  enablePro();
});

describe('JWT.isJWT()', function () {
  it('detects valid JWT format', function () {
    assert.ok(J.isJWT(VALID_JWT));
  });

  it('rejects empty string', function () {
    assert.ok(!J.isJWT(''));
  });

  it('rejects null', function () {
    assert.ok(!J.isJWT(null));
  });

  it('rejects undefined', function () {
    assert.ok(!J.isJWT(undefined));
  });

  it('rejects non-JWT string', function () {
    assert.ok(!J.isJWT('hello world'));
  });

  it('rejects JWT-like string without eyJ prefix', function () {
    assert.ok(!J.isJWT('abc.def.ghi'));
  });

  it('rejects JWT with only 1 dot', function () {
    assert.ok(!J.isJWT('eyJhbGci.eyJzdWI'));
  });

  it('rejects JWT with too many dots', function () {
    assert.ok(!J.isJWT('eyJ.a.b.c.d'));
  });

  it('matches typical JWT from auth0', function () {
    const auth0JWT = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleTEyMyJ9.eyJpc3MiOiJodHRwczovL2F1dGgwLmV4YW1wbGUuY29tIiwic3ViIjoiYXV0aDB8dXNlcl8xMjM0NTYiLCJhdWQiOiJhcGlfdGFyZ2V0IiwiZXhwIjoyNTM0MDIzMDA3OTl9.this_is_a_signature_part';
    assert.ok(J.isJWT(auth0JWT));
  });
});

// ---- decode ----

describe('JWT.decode()', function () {
  it('decodes header correctly', function () {
    const decoded = J.decode(VALID_JWT);
    assert.ok(decoded);
    assert.strictEqual(decoded.header.alg, 'HS256');
    assert.strictEqual(decoded.header.typ, 'JWT');
  });

  it('decodes payload correctly', function () {
    const decoded = J.decode(VALID_JWT);
    assert.strictEqual(decoded.payload.sub, '1234567890');
    assert.strictEqual(decoded.payload.name, 'John Doe');
    assert.strictEqual(decoded.payload.iat, 1516239022);
  });

  it('preserves signature part', function () {
    const decoded = J.decode(VALID_JWT);
    assert.strictEqual(decoded.signature, 'signature_part_here');
  });

  it('returns null for invalid JWT', function () {
    assert.strictEqual(J.decode('not a jwt'), null);
    assert.strictEqual(J.decode(''), null);
    assert.strictEqual(J.decode(null), null);
  });

  it('handles URL-safe base64 characters', function () {
    // JWT with - and _ (URL-safe base64 variants)
    const urlSafeJWT = 'eyJhIjoiQSJ9.eyJiIjoiQiJ9.c-d_e';
    const decoded = J.decode(urlSafeJWT);
    assert.ok(decoded);
  });
});

// ---- renderJWT ----

describe('JWT.renderJWT()', function () {
  it('renders HTML with JWT details', function () {
    const rendered = J.renderJWT(VALID_JWT);
    assert.ok(typeof rendered.full === 'string');
    assert.ok(rendered.full.length > 0);
  });

  it('includes HEADER label', function () {
    const rendered = J.renderJWT(VALID_JWT);
    assert.ok(rendered.full.indexOf('HEADER') > -1);
  });

  it('includes PAYLOAD label', function () {
    const rendered = J.renderJWT(VALID_JWT);
    assert.ok(rendered.full.indexOf('PAYLOAD') > -1);
  });

  it('includes algorithm in summary', function () {
    const rendered = J.renderJWT(VALID_JWT);
    assert.ok(rendered.full.indexOf('HS256') > -1);
  });

  it('includes sub claim in summary', function () {
    const rendered = J.renderJWT(VALID_JWT);
    assert.ok(rendered.full.indexOf('1234567890') > -1);
  });

  it('shows exp as valid (not expired) for future exp', function () {
    const rendered = J.renderJWT(VALID_JWT);
    // VALID_JWT has exp=9999999999 which is far in the future (~2286)
    // Should use the valid class
    assert.ok(rendered.full.indexOf('cj-jwt-valid') > -1);
  });

  it('shows exp as expired when in the past', function () {
    const rendered = J.renderJWT(EXPIRED_JWT);
    assert.ok(rendered.full.indexOf('cj-jwt-expired') > -1);
  });

  it('includes signature notice', function () {
    const rendered = J.renderJWT(VALID_JWT);
    assert.ok(rendered.full.indexOf('cannot verify') > -1 ||
              rendered.full.indexOf('Signature') > -1);
  });

  it('renders cleanly for minimal JWT', function () {
    const minimalJWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.sig';
    const rendered = J.renderJWT(minimalJWT);
    assert.ok(typeof rendered.full === 'string');
    assert.ok(rendered.full.length > 0);
  });

  it('handles decode failure gracefully', function () {
    // A JWT-like string that base64 decodes to invalid JSON
    const badJWT = 'eyJhbGci.eyJzdWIi.sig'; // too short parts
    const isJwt = J.isJWT(badJWT);
    // The regex might or might not match this — if it does, decode should handle it
    if (isJwt) {
      const decoded = J.decode(badJWT);
      // Should be null because base64 decode of short strings probably fails
      assert.strictEqual(decoded, null);
    }
  });
});

// ---- isProEnabled ----

describe('JWT.isProEnabled()', function () {
  it('returns true when dev mode is on', function () {
    enablePro();
    assert.ok(J.isProEnabled());
  });

  it('returns false when dev mode is off and no license', function () {
    disablePro();
    assert.strictEqual(J.isProEnabled(), false);
  });
});

resetAll();
