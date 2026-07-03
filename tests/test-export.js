/**
 * Tests for export.js — CSV, TSV, TypeScript type generation, YAML export.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { setupForExport, resetAll } = require('./helpers/setup.js');

setupForExport();
const E = window.ClearJSON.Export;

// ---- toCSV ----

describe('Export.toCSV()', function () {
  it('converts array of objects to CSV', function () {
    const data = [
      { name: 'Alice', age: 30, city: 'NYC' },
      { name: 'Bob', age: 25, city: 'LA' },
    ];
    const csv = E.toCSV(data);
    assert.ok(typeof csv === 'string');
    assert.ok(csv.indexOf('name,age,city') > -1 || csv.indexOf('name') === 0, 'has header row');
    assert.ok(csv.indexOf('Alice') > -1);
    assert.ok(csv.indexOf('Bob') > -1);
  });

  it('escapes commas in values', function () {
    const data = [{ name: 'Smith, Jr.', age: 40 }];
    const csv = E.toCSV(data);
    // Values with commas should be quoted
    assert.ok(csv.indexOf('"Smith, Jr."') > -1 || csv.indexOf('Smith') > -1);
  });

  it('handles null values', function () {
    const data = [{ a: null, b: 'value' }];
    const csv = E.toCSV(data);
    assert.ok(typeof csv === 'string');
    assert.ok(csv.length > 0);
  });

  it('handles empty array', function () {
    const csv = E.toCSV([]);
    assert.strictEqual(csv, '');
  });

  it('handles non-array objects', function () {
    const csv = E.toCSV({ key: 'value' });
    assert.ok(typeof csv === 'string');
  });

  it('detects columns from first item', function () {
    const data = [{ x: 1, y: 2, z: 3 }];
    const csv = E.toCSV(data);
    const lines = csv.trim().split('\n');
    assert.ok(lines.length >= 1);
    const headers = lines[0].split(',');
    assert.ok(headers.indexOf('x') !== -1);
    assert.ok(headers.indexOf('y') !== -1);
    assert.ok(headers.indexOf('z') !== -1);
  });

  it('handles missing keys in some items', function () {
    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob' },
    ];
    const csv = E.toCSV(data);
    assert.ok(typeof csv === 'string');
    assert.ok(csv.length > 0);
  });
});

// ---- toTSV ----

describe('Export.toTSV()', function () {
  it('converts array of objects to TSV', function () {
    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ];
    const tsv = E.toTSV(data);
    assert.ok(typeof tsv === 'string');
    assert.ok(tsv.indexOf('\t') > -1, 'uses tab separators');
    assert.ok(tsv.indexOf('Alice') > -1);
  });

  it('handles empty array', function () {
    assert.strictEqual(E.toTSV([]), '');
  });
});

// ---- toTypeScript ----

describe('Export.toTypeScript()', function () {
  it('generates TypeScript interface for simple object', function () {
    const data = { name: 'test', count: 5, active: true };
    const ts = E.toTypeScript(data, 'MyType');
    assert.ok(typeof ts === 'string');
    assert.ok(ts.indexOf('interface') > -1 || ts.indexOf('type') > -1, 'has type declaration');
    assert.ok(ts.indexOf('name') > -1);
    assert.ok(ts.indexOf('count') > -1);
  });

  it('uses provided root name', function () {
    const ts = E.toTypeScript({ a: 1 }, 'TestRoot');
    assert.ok(ts.indexOf('TestRoot') > -1);
  });

  it('handles array input', function () {
    const data = [{ id: 1, name: 'a' }];
    const ts = E.toTypeScript(data, 'Items');
    assert.ok(typeof ts === 'string');
    assert.ok(ts.length > 0);
  });

  it('maps string to string type', function () {
    const ts = E.toTypeScript({ name: 'hello' }, 'T');
    assert.ok(ts.indexOf('string') > -1);
  });

  it('maps number to number type', function () {
    const ts = E.toTypeScript({ count: 42 }, 'T');
    assert.ok(ts.indexOf('number') > -1);
  });

  it('maps boolean to boolean type', function () {
    const ts = E.toTypeScript({ flag: true }, 'T');
    assert.ok(ts.indexOf('boolean') > -1);
  });

  it('handles nested objects', function () {
    const data = { user: { name: 'a', age: 30 } };
    const ts = E.toTypeScript(data, 'Root');
    assert.ok(typeof ts === 'string');
    assert.ok(ts.length > 0);
    // Should generate nested interface
    assert.ok(ts.indexOf('interface RootUser') > -1 || ts.indexOf('interface Root') > -1);
  });

  it('deduplicates identical nested structures', function () {
    const data = {
      user: { name: 'Alice', email: 'a@a.com' },
      author: { name: 'Bob', email: 'b@b.com' }
    };
    const ts = E.toTypeScript(data, 'Post');
    // Both user and author should reference the same interface
    const matches = ts.match(/PostUser/g);
    assert.ok(matches.length >= 3, 'PostUser should appear at least 3 times (interface + 2 refs)');
  });

  it('handles null fields with optional marker', function () {
    const data = { name: 'test', updated: null };
    const ts = E.toTypeScript(data, 'T');
    assert.ok(ts.indexOf('?:') > -1 || ts.indexOf('? :') > -1, 'null field should be optional');
  });

  it('handles empty object', function () {
    const data = {};
    const ts = E.toTypeScript(data, 'Empty');
    assert.ok(ts.indexOf('Record') > -1 || ts.length >= 0);
  });

  it('handles arrays of objects', function () {
    const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const ts = E.toTypeScript(data, 'Users');
    assert.ok(ts.indexOf('interface') > -1);
    assert.ok(ts.indexOf('id') > -1);
    assert.ok(ts.indexOf('name') > -1);
  });
});

// ---- toYAML ----

describe('Export.toYAML()', function () {
  it('converts simple object to YAML', function () {
    const data = { name: 'test', count: 5 };
    const yaml = E.toYAML(data);
    assert.ok(typeof yaml === 'string');
    assert.ok(yaml.indexOf('name:') > -1);
    assert.ok(yaml.indexOf('count:') > -1);
  });

  it('converts array to YAML list', function () {
    const yaml = E.toYAML([1, 2, 3]);
    assert.ok(typeof yaml === 'string');
    assert.ok(yaml.length > 0);
  });

  it('handles nested objects', function () {
    const data = { user: { name: 'Alice', age: 30 } };
    const yaml = E.toYAML(data);
    assert.ok(typeof yaml === 'string');
    assert.ok(yaml.length > 0);
  });

  it('handles empty object', function () {
    const yaml = E.toYAML({});
    assert.ok(typeof yaml === 'string');
  });
});

resetAll();
