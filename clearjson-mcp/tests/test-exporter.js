/**
 * Tests for the core exporter module.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toCSV, toTSV, toYAML, toTypeScript } from '../src/core/exporter.js';

const users = [
  { name: 'Alice', email: 'alice@test.com', age: 30 },
  { name: 'Bob', email: 'bob@test.com', age: 25 },
];

describe('toCSV', () => {
  it('converts array of objects to CSV', () => {
    const csv = toCSV(users);
    assert.ok(csv.indexOf('name,email,age') !== -1);
    assert.ok(csv.indexOf('Alice') !== -1);
    assert.ok(csv.indexOf('Bob') !== -1);
  });

  it('returns empty for non-array', () => {
    assert.equal(toCSV({ a: 1 }), '');
    assert.equal(toCSV([]), '');
  });

  it('escapes commas in values', () => {
    const data = [{ name: 'Doe, John', role: 'admin' }];
    const csv = toCSV(data);
    assert.ok(csv.indexOf('"Doe, John"') !== -1);
  });

  it('escapes quotes in values', () => {
    const data = [{ name: 'He said "hello"', role: 'user' }];
    const csv = toCSV(data);
    assert.ok(csv.indexOf('"He said ""hello"""') !== -1);
  });
});

describe('toTSV', () => {
  it('converts to tab-separated', () => {
    const tsv = toTSV(users);
    assert.ok(tsv.indexOf('name\temail\tage') !== -1);
    assert.ok(tsv.indexOf('Alice') !== -1);
  });
});

describe('toYAML', () => {
  it('converts simple object', () => {
    const yaml = toYAML({ name: 'Alice', age: 30 });
    assert.ok(yaml.indexOf('name: Alice') !== -1);
    assert.ok(yaml.indexOf('age: 30') !== -1);
  });

  it('converts null and booleans', () => {
    const yaml = toYAML({ a: null, b: true, c: false });
    assert.ok(yaml.indexOf('a: null') !== -1);
    assert.ok(yaml.indexOf('b: true') !== -1);
  });

  it('converts arrays inline for simple items', () => {
    const yaml = toYAML({ tags: ['dev', 'ops'] });
    assert.ok(yaml.indexOf('tags:') !== -1);
  });

  it('handles nested objects', () => {
    const yaml = toYAML({ user: { name: 'Alice', addr: { city: 'NYC' } } });
    assert.ok(yaml.indexOf('user:') !== -1);
    assert.ok(yaml.indexOf('name: Alice') !== -1);
  });
});

describe('toTypeScript', () => {
  it('generates interfaces', () => {
    const ts = toTypeScript({ name: 'Alice', age: 30 });
    assert.ok(ts.indexOf('interface Root') !== -1);
    assert.ok(ts.indexOf('name: string') !== -1);
    assert.ok(ts.indexOf('age: number') !== -1);
  });

  it('deduplicates identical structures', () => {
    const data = {
      user: { name: 'Alice', email: 'a@t.com' },
      admin: { name: 'Bob', email: 'b@t.com' },
    };
    const ts = toTypeScript(data);
    // Should create one shared interface, not two identical ones
    const interfaceCount = (ts.match(/interface/g) || []).length;
    assert.equal(interfaceCount, 2); // Root + shared inner type
  });

  it('handles optional nullable fields', () => {
    const data = { name: 'Alice', email: null };
    const ts = toTypeScript(data);
    assert.ok(ts.indexOf('email?') !== -1);
  });

  it('handles arrays of objects', () => {
    const data = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const ts = toTypeScript(data, 'Users');
    assert.ok(ts.indexOf('interface Users') !== -1);
  });
});
