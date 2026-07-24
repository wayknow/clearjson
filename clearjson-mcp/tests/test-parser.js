/**
 * Tests for the core parser module.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse, format, minify, computeStats } from '../src/core/parser.js';

describe('parse', () => {
  it('parses valid JSON', () => {
    const result = parse('{"a": 1}');
    assert.equal(result.ok, true);
    assert.deepEqual(result.data, { a: 1 });
  });

  it('parses arrays', () => {
    const result = parse('[1, 2, 3]');
    assert.equal(result.ok, true);
    assert.deepEqual(result.data, [1, 2, 3]);
  });

  it('reports error for invalid JSON', () => {
    const result = parse('{bad}');
    assert.equal(result.ok, false);
    assert.ok(result.error);
    assert.ok(result.line >= 1);
  });

  it('reports line/column for invalid JSON', () => {
    const json = '[\n  "a",\n  "b",,\n]';
    const result = parse(json);
    assert.equal(result.ok, false);
    assert.ok(result.line >= 1);
    assert.ok(result.column >= 1);
  });

  it('computes stats', () => {
    const result = parse('{"a": 1, "b": [1, 2]}');
    assert.equal(result.ok, true);
    assert.equal(result.stats.nodes, 5);
    assert.equal(result.stats.maxDepth, 3); // obj → b → arr[0]
  });

  it('handles null, boolean, number types', () => {
    const result = parse('{"a": null, "b": true, "c": false, "d": 3.14}');
    assert.equal(result.ok, true);
    assert.equal(result.data.a, null);
    assert.equal(result.data.b, true);
    assert.equal(result.data.c, false);
    assert.equal(result.data.d, 3.14);
  });

  it('handles deeply nested structures', () => {
    const json = '{"a":{"b":{"c":{"d":{"e":1}}}}}';
    const result = parse(json);
    assert.equal(result.ok, true);
    assert.equal(result.stats.maxDepth, 6);
  });
});

describe('format', () => {
  it('formats with indent', () => {
    const data = { a: 1, b: [1, 2] };
    const out = format(data, 2);
    assert.ok(out.indexOf('  ') !== -1);
    assert.ok(out.indexOf('"a"') !== -1);
  });

  it('formats with custom indent', () => {
    const data = { a: 1 };
    const out = format(data, 4);
    assert.ok(out.indexOf('    ') !== -1);
  });
});

describe('minify', () => {
  it('removes all whitespace', () => {
    const data = { a: 1, b: [1, 2] };
    const out = minify(data);
    assert.equal(out, '{"a":1,"b":[1,2]}');
  });
});

describe('computeStats', () => {
  it('counts nodes and depth', () => {
    const stats = computeStats({ a: 1, b: [2, 3] }, '');
    assert.equal(stats.nodes, 5);
    assert.equal(stats.maxDepth, 3);
  });

  it('handles empty object', () => {
    const stats = computeStats({}, '');
    assert.equal(stats.nodes, 1);
    assert.equal(stats.maxDepth, 1);
  });

  it('handles empty array', () => {
    const stats = computeStats([], '');
    assert.equal(stats.nodes, 1);
    assert.equal(stats.maxDepth, 1);
  });
});
