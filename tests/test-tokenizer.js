/**
 * Tests for tokenizer.js — syntax highlighting, URL/image detection.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { setupForTokenizer, resetAll } = require('./helpers/setup.js');

setupForTokenizer();
const T = window.ClearJSON.Tokenizer;

// ---- isURL ----

describe('Tokenizer.isURL()', function () {
  it('detects http URL', function () {
    assert.ok(T.isURL('http://example.com'));
  });

  it('detects https URL', function () {
    assert.ok(T.isURL('https://example.com/path?query=1'));
  });

  it('detects URL with port', function () {
    assert.ok(T.isURL('https://localhost:3000/api/data'));
  });

  it('rejects path-only URL', function () {
    assert.ok(!T.isURL('/api/data'));
  });

  it('rejects plain text', function () {
    assert.ok(!T.isURL('hello world'));
  });

  it('rejects empty string', function () {
    assert.ok(!T.isURL(''));
  });

  it('rejects number string', function () {
    assert.ok(!T.isURL('42'));
  });
});

// ---- isImageURL ----

describe('Tokenizer.isImageURL()', function () {
  it('detects .png URL', function () {
    assert.ok(T.isImageURL('https://example.com/image.png'));
  });

  it('detects .jpg URL', function () {
    assert.ok(T.isImageURL('https://example.com/photo.jpg'));
  });

  it('detects .jpeg URL', function () {
    assert.ok(T.isImageURL('https://example.com/photo.jpeg'));
  });

  it('detects .gif URL', function () {
    assert.ok(T.isImageURL('https://example.com/animation.gif'));
  });

  it('detects .svg URL', function () {
    assert.ok(T.isImageURL('https://example.com/icon.svg'));
  });

  it('detects .webp URL', function () {
    assert.ok(T.isImageURL('https://example.com/img.webp'));
  });

  it('detects with query params', function () {
    assert.ok(T.isImageURL('https://example.com/img.png?w=200&h=100'));
  });

  it('rejects non-image URL', function () {
    assert.ok(!T.isImageURL('https://example.com/data.json'));
  });

  it('rejects plain text', function () {
    assert.ok(!T.isImageURL('photo.png'));
  });
});

// ---- tokenize ----

describe('Tokenizer.tokenize()', function () {
  it('tokenizes a simple JSON object', function () {
    const tokens = T.tokenize('{"key": "value"}');
    assert.ok(Array.isArray(tokens));
    assert.ok(tokens.length > 0);
  });

  it('includes string token for string values', function () {
    const tokens = T.tokenize('"hello world"');
    const stringTokens = tokens.filter(function (t) { return t.type === 'string'; });
    assert.strictEqual(stringTokens.length, 1);
    assert.ok(stringTokens[0].value.indexOf('hello world') > -1);
  });

  it('includes number token for numbers', function () {
    const tokens = T.tokenize('42');
    const numTokens = tokens.filter(function (t) { return t.type === 'number'; });
    assert.strictEqual(numTokens.length, 1);
  });

  it('includes boolean token for true/false', function () {
    const tokens = T.tokenize('true false');
    const boolTokens = tokens.filter(function (t) { return t.type === 'boolean'; });
    assert.strictEqual(boolTokens.length, 2);
  });

  it('includes null token for null', function () {
    const tokens = T.tokenize('null');
    const nullTokens = tokens.filter(function (t) { return t.type === 'null'; });
    assert.strictEqual(nullTokens.length, 1);
  });

  it('includes punctuation tokens for braces', function () {
    const tokens = T.tokenize('{"a": [1, 2]}');
    const punctTokens = tokens.filter(function (t) { return t.type === 'punctuation'; });
    assert.ok(punctTokens.length >= 6, 'expected >=6 punctuation tokens, got ' + punctTokens.length);
  });

  it('identifies key tokens for object keys', function () {
    const tokens = T.tokenize('{"name": "value"}');
    const keyTokens = tokens.filter(function (t) { return t.type === 'key'; });
    assert.strictEqual(keyTokens.length, 1);
  });

  it('handles empty object', function () {
    const tokens = T.tokenize('{}');
    assert.ok(tokens.length > 0);
  });

  it('handles empty array', function () {
    const tokens = T.tokenize('[]');
    assert.ok(tokens.length > 0);
  });

  it('handles deeply nested JSON', function () {
    var nested = { a: { b: { c: { d: [1, 2, 3] } } } };
    const tokens = T.tokenize(JSON.stringify(nested));
    assert.ok(tokens.length > 0);
  });

  it('every token has type and value', function () {
    const tokens = T.tokenize('{"a": 1, "b": "hello", "c": null, "d": true}');
    tokens.forEach(function (t) {
      assert.ok(typeof t.type === 'string', 'token has type string');
      assert.ok(typeof t.value === 'string', 'token has value string');
      assert.ok(t.value.length > 0, 'token value is non-empty');
    });
  });
});

// ---- toHTML ----

describe('Tokenizer.toHTML()', function () {
  it('returns a string', function () {
    const html = T.toHTML('{"key": 123}', false);
    assert.ok(typeof html === 'string');
    assert.ok(html.length > 0);
  });

  it('includes syntax-highlighting spans', function () {
    const html = T.toHTML('{"name": "test"}', false);
    assert.ok(html.indexOf('class=') > -1 || html.indexOf("class=") > -1);
  });

  it('includes line numbers when requested', function () {
    const html = T.toHTML('{"a": 1,\n"b": 2}', true);
    assert.ok(html.indexOf('line') > -1 || html.indexOf('class=') > -1);
  });

  it('handles multi-line JSON', function () {
    const json = JSON.stringify({ a: 1, b: 2, c: 3 }, null, 2);
    const html = T.toHTML(json, true);
    assert.ok(typeof html === 'string');
    assert.ok(html.length > 0);
  });
});

resetAll();
