/**
 * Tests for parser.js — JSON detection, parsing, stats, content-type detection.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { setupForParser, resetAll } = require('./helpers/setup.js');

setupForParser();
const P = window.ClearJSON.Parser;

// ---- looksLikeJSON ----

describe('Parser.looksLikeJSON()', function () {
  it('detects valid JSON object', function () {
    assert.ok(P.looksLikeJSON('{"key": "value"}'));
  });

  it('detects valid JSON array', function () {
    assert.ok(P.looksLikeJSON('[1, 2, 3]'));
  });

  it('detects JSON with whitespace around it', function () {
    assert.ok(P.looksLikeJSON('  \n{"key": true}\n  '));
  });

  it('rejects plain text', function () {
    assert.ok(!P.looksLikeJSON('hello world'));
  });

  it('rejects HTML', function () {
    assert.ok(!P.looksLikeJSON('<html><body></body></html>'));
  });

  it('rejects empty string', function () {
    assert.ok(!P.looksLikeJSON(''));
  });

  it('detects string value (loose mode)', function () {
    // Single string value can be valid JSON, starts with "
    assert.ok(P.looksLikeJSON('"just a string"'));
  });

  it('rejects numbers (not JSON-like enough for a page)', function () {
    // looksLikeJSON requires first char to be { [ or "
    assert.ok(!P.looksLikeJSON('42'));
  });

  it('rejects booleans (not JSON-like enough for a page)', function () {
    assert.ok(!P.looksLikeJSON('true'));
    assert.ok(!P.looksLikeJSON('false'));
  });

  it('rejects null (not JSON-like enough for a page)', function () {
    assert.ok(!P.looksLikeJSON('null'));
  });

  it('rejects trailing comma object', function () {
    // Should still detect as JSON-like so we can show parse error
    assert.ok(P.looksLikeJSON('{"a": 1,}'));
  });
});

// ---- parse ----

describe('Parser.parse()', function () {
  it('parses simple object', function () {
    const result = P.parse('{"name": "test", "count": 5}');
    assert.ok(result.ok);
    assert.deepStrictEqual(result.data, { name: 'test', count: 5 });
    assert.ok(result.stats.parseTimeMs >= 0);
  });

  it('parses nested objects', function () {
    const json = '{"user": {"name": "a", "age": 30}, "tags": ["x", "y"]}';
    const result = P.parse(json);
    assert.ok(result.ok);
    assert.strictEqual(result.data.user.name, 'a');
    assert.strictEqual(result.data.user.age, 30);
    assert.deepStrictEqual(result.data.tags, ['x', 'y']);
  });

  it('parses large array', function () {
    const items = [];
    for (let i = 0; i < 500; i++) {
      items.push({ id: i, name: 'item-' + i });
    }
    const json = JSON.stringify(items);
    const result = P.parse(json);
    assert.ok(result.ok);
    assert.strictEqual(result.data.length, 500);
  });

  it('reports parse error with line and column', function () {
    const result = P.parse('{"a": 1,}');
    assert.ok(!result.ok);
    assert.ok(result.error);
    assert.ok(typeof result.line === 'number');
    assert.ok(typeof result.column === 'number');
  });

  it('reports error for unquoted key', function () {
    const result = P.parse('{key: "value"}');
    assert.ok(!result.ok);
  });

  it('reports error for single quotes', function () {
    const result = P.parse("{'key': 'value'}");
    assert.ok(!result.ok);
  });

  it('reports stats with nodes and depth', function () {
    const result = P.parse('{"a": 1, "b": [2, 3]}');
    assert.ok(result.ok);
    assert.ok(result.stats.nodes > 0);
    assert.ok(result.stats.maxDepth >= 2);
    assert.ok(typeof result.stats.parseTimeMs === 'number');
  });
});

// ---- computeStats ----

describe('Parser.computeStats()', function () {
  it('counts nodes', function () {
    const stats = P.computeStats({ a: 1, b: [2, 3, { c: 4 }] }, '');
    assert.ok(stats.nodes > 0);
  });

  it('computes max depth for flat object', function () {
    const stats = P.computeStats({ a: 1, b: 2 }, '');
    assert.strictEqual(stats.maxDepth, 2); // root + leaf values
  });

  it('computes max depth for nested object', function () {
    const stats = P.computeStats({ a: { b: { c: { d: 1 } } } }, '');
    assert.ok(stats.maxDepth >= 4);
  });

  it('returns numeric nodes for any input', function () {
    const stats = P.computeStats('hello', '');
    assert.strictEqual(stats.nodes, 1);
    assert.strictEqual(stats.maxDepth, 1);
  });
});

// ---- isJSONContentType ----

describe('Parser.isJSONContentType()', function () {
  it('detects application/json', function () {
    assert.ok(P.isJSONContentType('application/json'));
  });

  it('detects application/json with charset', function () {
    assert.ok(P.isJSONContentType('application/json; charset=utf-8'));
  });

  it('detects application/ld+json', function () {
    assert.ok(P.isJSONContentType('application/ld+json'));
  });

  it('detects application/vnd.api+json', function () {
    assert.ok(P.isJSONContentType('application/vnd.api+json'));
  });

  it('rejects text/html', function () {
    assert.ok(!P.isJSONContentType('text/html'));
  });

  it('rejects application/json in a longer type', function () {
    // Should NOT match if it's not a prefix match
    // e.g. "x-application/json" is NOT JSON
    assert.ok(!P.isJSONContentType('application/x-json-custom'));
  });

  it('rejects empty or null', function () {
    assert.ok(!P.isJSONContentType(''));
    assert.ok(!P.isJSONContentType(null));
  });
});

// Clean up
resetAll();
