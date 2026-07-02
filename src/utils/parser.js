/**
 * ClearJSON Parser — lightweight JSON parsing and detection.
 *
 * Uses the browser's native JSON.parse with enhanced error reporting.
 * In Pro version, this will be replaced with a streaming parser for large files.
 */

var ClearJSON = window.ClearJSON || {};

(function (C) {
  'use strict';

  /**
   * Quick check: does this text look like JSON?
   * Runs in < 1ms on non-JSON pages. Returns false for HTML/XML/plain text.
   *
   * @param {string} text - First ~500 chars of response body
   * @returns {boolean}
   */
  function looksLikeJSON(text) {
    if (!text || typeof text !== 'string') return false;

    var trimmed = text.trim();
    if (trimmed.length === 0) return false;

    var firstChar = trimmed[0];

    // JSON must start with { [ or "
    if (firstChar !== '{' && firstChar !== '[' && firstChar !== '"') {
      return false;
    }

    // If it starts with { or [, it's almost certainly JSON
    // Quick HTML check: if it contains <!doctype, <html, <head, <body — skip
    var lower = trimmed.substring(0, 200).toLowerCase();
    if (
      lower.indexOf('<!doctype') !== -1 ||
      lower.indexOf('<html') !== -1 ||
      lower.indexOf('<head') !== -1 ||
      lower.indexOf('<body') !== -1
    ) {
      return false;
    }

    return true;
  }

  /**
   * Parse JSON text with enhanced error reporting.
   *
   * @param {string} text - Raw JSON string
   * @returns {{ ok: true, data: any, stats: object } | { ok: false, error: string, line: number, column: number }}
   */
  function parse(text) {
    var startTime = performance.now();
    var trimmed = text.trim();

    try {
      var data = JSON.parse(trimmed);

      var elapsed = performance.now() - startTime;
      var stats = computeStats(data, trimmed);

      return {
        ok: true,
        data: data,
        stats: {
          nodes: stats.nodes,
          maxDepth: stats.maxDepth,
          sizeBytes: new Blob([text]).size,
          parseTimeMs: Math.round(elapsed * 100) / 100
        }
      };
    } catch (e) {
      // Extract line/column from error message
      var line = 1;
      var column = 1;

      if (e instanceof SyntaxError) {
        var match = e.message.match(/position\s+(\d+)/i);
        if (match) {
          var pos = parseInt(match[1], 10);
          var before = trimmed.substring(0, pos);
          line = (before.match(/\n/g) || []).length + 1;
          var lastNewline = before.lastIndexOf('\n');
          column = lastNewline === -1 ? pos + 1 : pos - lastNewline;
        }
      }

      return {
        ok: false,
        error: e.message,
        line: line,
        column: column
      };
    }
  }

  /**
   * Traverse parsed JSON to compute node count and max depth.
   */
  function computeStats(data, rawText) {
    var nodes = 0;
    var maxDepth = 0;

    function walk(value, depth) {
      nodes++;
      if (depth > maxDepth) maxDepth = depth;

      if (Array.isArray(value)) {
        for (var i = 0; i < value.length; i++) {
          walk(value[i], depth + 1);
        }
      } else if (value !== null && typeof value === 'object') {
        var keys = Object.keys(value);
        for (var i = 0; i < keys.length; i++) {
          walk(value[keys[i]], depth + 1);
        }
      }
    }

    walk(data, 1);
    return { nodes: nodes, maxDepth: maxDepth };
  }

  /**
   * Check if a URL response is JSON via Content-Type header.
   * Called from content script which has access to document.contentType.
   *
   * @param {string} contentType
   * @returns {boolean}
   */
  function isJSONContentType(contentType) {
    if (!contentType) return false;
    var ct = contentType.toLowerCase().split(';')[0].trim();

    return (
      ct === 'application/json' ||
      ct === 'application/ld+json' ||
      ct === 'application/vnd.api+json' ||   // JSON:API
      ct === 'application/hal+json' ||
      ct === 'application/x-ndjson' ||
      ct === 'text/json' ||
      ct === 'text/x-json'
    );
  }

  C.Parser = {
    looksLikeJSON: looksLikeJSON,
    parse: parse,
    isJSONContentType: isJSONContentType,
    computeStats: computeStats
  };
})(ClearJSON);
