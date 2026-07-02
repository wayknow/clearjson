/**
 * ClearJSON JWT Decoder
 *
 * Detects JWT tokens (eyJ...) in string values and decodes
 * the header and payload inline. Pro feature.
 *
 * JWT format: header.payload.signature
 * All three parts are Base64Url-encoded.
 */

var ClearJSON = window.ClearJSON || {};

(function (C) {
  'use strict';

  var JWT_RE = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

  // ================================================================
  //  DETECTION
  // ================================================================

  function isJWT(str) {
    if (!str || typeof str !== 'string') return false;
    return JWT_RE.test(str);
  }

  // ================================================================
  //  DECODING
  // ================================================================

  function base64UrlDecode(str) {
    // Replace URL-safe chars and add padding
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    try {
      return atob(str);
    } catch (e) {
      return null;
    }
  }

  function decode(str) {
    if (!isJWT(str)) return null;
    try {
      var parts = str.split('.');
      var headerRaw = base64UrlDecode(parts[0]);
      var payloadRaw = base64UrlDecode(parts[1]);
      if (!headerRaw || !payloadRaw) return null;
      return {
        header: JSON.parse(headerRaw),
        payload: JSON.parse(payloadRaw),
        signature: parts[2]
      };
    } catch (e) {
      return null;
    }
  }

  // ================================================================
  //  HTML RENDERING (shared by tree.js and virtual-tree.js)
  // ================================================================

  /**
   * Build the HTML for a JWT string value.
   * Shows the decoded header + payload in an expandable inline section.
   *
   * @param {string} str — The raw JWT string
   * @returns {{ short: string, full: string }}
   */
  function renderJWT(str) {
    var decoded = decode(str);
    if (!decoded) {
      return {
        short: '<span class="cj-string">"' + escapeHTML(str) + '"</span>',
        full: ''
      };
    }

    var short = escapeHTML(str.substring(0, 40)) + '…';

    var headerJSON = JSON.stringify(decoded.header, null, 2);
    var payloadJSON = JSON.stringify(decoded.payload, null, 2);

    // Pick key fields for the collapsed summary
    var summaryParts = [];
    if (decoded.header.alg) summaryParts.push('alg: ' + escapeHTML(decoded.header.alg));
    if (decoded.header.typ) summaryParts.push('typ: ' + escapeHTML(decoded.header.typ));
    if (decoded.payload.sub) summaryParts.push('sub: ' + escapeHTML(decoded.payload.sub));
    if (decoded.payload.iss) summaryParts.push('iss: ' + escapeHTML(decoded.payload.iss));
    if (decoded.payload.exp) {
      var expDate = new Date(decoded.payload.exp * 1000);
      var now = new Date();
      var isExpired = expDate < now;
      var expStr = expDate.toISOString().split('T')[0];
      summaryParts.push(
        'exp: <span class="' + (isExpired ? 'cj-jwt-expired' : 'cj-jwt-valid') + '">' + expStr + '</span>'
      );
    }
    if (decoded.payload.iat) {
      summaryParts.push('iat: ' + new Date(decoded.payload.iat * 1000).toISOString().split('T')[0]);
    }
    var summary = summaryParts.join(' • ') || 'no claims';

    // Build HTML
    var html = '<span class="cj-jwt-toggle" onclick="this.closest(\'.cj-value\').classList.toggle(\'cj-jwt-expanded\')" ' +
      'title="Click to expand/collapse JWT details">' +
      '🔐 <span class="cj-jwt-summary">' + summary + '</span>' +
      '</span>';

    html += '<span class="cj-jwt-detail">';
    html += '<div class="cj-jwt-block">';
    html += '<div class="cj-jwt-label">HEADER</div>';
    html += '<pre class="cj-jwt-json">' + escapeHTML(headerJSON) + '</pre>';
    html += '</div>';
    html += '<div class="cj-jwt-block">';
    html += '<div class="cj-jwt-label">PAYLOAD</div>';
    html += '<pre class="cj-jwt-json">' + escapeHTML(payloadJSON) + '</pre>';
    html += '</div>';
    html += '<div class="cj-jwt-footer">';
    html += 'Signature (cannot verify in browser)';
    html += '</div>';
    html += '</span>';

    // The raw token shown as a tooltip or collapsed
    var rawToken = '<span class="cj-jwt-raw" title="' + escapeHTML(str) + '">🔐 JWT</span>';

    return { short: rawToken, full: html };
  }

  function isJWTProEnabled() {
    return C.License && C.License.isActive();
  }

  // Simple HTML escape
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  C.JWT = {
    isJWT: isJWT,
    decode: decode,
    renderJWT: renderJWT,
    isProEnabled: isJWTProEnabled
  };
})(ClearJSON);
