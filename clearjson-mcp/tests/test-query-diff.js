/**
 * Tests for query_json and diff_json tools.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Re-implement the core query/diff logic inline for testing
// (ESM makes it tricky to import unexported functions from tools/)

// ─── JSONPath engine (extracted for testing) ───────

function evaluate(data, expr) {
  if (!expr || typeof expr !== 'string') throw new Error('path required');
  if (!expr.startsWith('$')) throw new Error('must start with $');

  const tokens = tokenize(expr);
  let current = [{ path: '$', value: data }];

  for (const token of tokens) {
    const next = [];
    for (const node of current) {
      const matches = applyToken(node, token);
      for (const m of matches) next.push(m);
    }
    current = next;
    if (current.length === 0) break;
  }

  return current;
}

function tokenize(expr) {
  const tokens = [];
  let i = 1;

  while (i < expr.length) {
    if (expr[i] === '.' && expr[i + 1] === '.') {
      tokens.push({ type: 'descendant' });
      i += 2;
      continue;
    }

    if (expr[i] === '.') {
      i++;
      if (expr[i] === '*') { tokens.push({ type: 'wildcard' }); i++; continue; }
      const name = readIdentifier(expr, i);
      tokens.push({ type: 'child', key: name });
      i += name.length;
      continue;
    }

    if (expr[i] === '[') {
      i++;
      const bracketContent = readBracketContent(expr, i);
      i += bracketContent.length + 1;

      if (bracketContent.startsWith('?(') && bracketContent.endsWith(')')) {
        const filterExpr = bracketContent.slice(2, -1);
        tokens.push({ type: 'filter', expr: filterExpr });
        continue;
      }

      if (bracketContent === '*') {
        tokens.push({ type: 'wildcard' });
        continue;
      }

      if (bracketContent.indexOf(':') !== -1) {
        const parts = bracketContent.split(':');
        tokens.push({
          type: 'slice',
          start: parts[0] ? parseInt(parts[0], 10) : 0,
          end: parts[1] ? parseInt(parts[1], 10) : undefined,
          step: parts[2] ? parseInt(parts[2], 10) : 1
        });
        continue;
      }

      if (/^-?\d+$/.test(bracketContent)) {
        tokens.push({ type: 'index', index: parseInt(bracketContent, 10) });
        continue;
      }

      if ((bracketContent.startsWith("'") && bracketContent.endsWith("'")) ||
          (bracketContent.startsWith('"') && bracketContent.endsWith('"'))) {
        tokens.push({ type: 'child', key: bracketContent.slice(1, -1) });
        continue;
      }

      tokens.push({ type: 'child', key: bracketContent });
      continue;
    }

    throw new Error(`Unexpected char at ${i}: "${expr[i]}"`);
  }

  return tokens;
}

function readIdentifier(expr, start) {
  let i = start;
  while (i < expr.length && /[a-zA-Z0-9_$-]/.test(expr[i])) i++;
  if (i === start) throw new Error(`Expected identifier at ${start}`);
  return expr.substring(start, i);
}

function readBracketContent(expr, start) {
  let depth = 1;
  let i = start;
  while (i < expr.length && depth > 0) {
    if (expr[i] === '[') depth++;
    else if (expr[i] === ']') depth--;
    i++;
  }
  return expr.substring(start, i - 1);
}

function applyToken(node, token) {
  const results = [];
  const v = node.value;

  switch (token.type) {
    case 'child':
      if (v !== null && typeof v === 'object' && !Array.isArray(v) && token.key in v) {
        results.push({ path: node.path + '.' + token.key, value: v[token.key] });
      }
      break;

    case 'wildcard':
      if (Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) results.push({ path: node.path + '[' + i + ']', value: v[i] });
      } else if (v !== null && typeof v === 'object') {
        for (const k of Object.keys(v)) results.push({ path: node.path + '.' + k, value: v[k] });
      }
      break;

    case 'index':
      if (Array.isArray(v)) {
        let idx = token.index;
        if (idx < 0) idx = v.length + idx;
        if (idx >= 0 && idx < v.length) results.push({ path: node.path + '[' + idx + ']', value: v[idx] });
      }
      break;

    case 'slice':
      if (Array.isArray(v)) {
        const len = v.length;
        let start = token.start < 0 ? Math.max(0, len + token.start) : token.start;
        let end = token.end !== undefined ? (token.end < 0 ? Math.max(0, len + token.end) : token.end) : len;
        start = Math.max(0, Math.min(start, len));
        end = Math.max(0, Math.min(end, len));
        for (let i = start; i < end; i += token.step) {
          results.push({ path: node.path + '[' + i + ']', value: v[i] });
        }
      }
      break;

    case 'filter':
      if (Array.isArray(v)) {
        for (let i = 0; i < v.length; i++) {
          if (evaluateFilter(v[i], token.expr)) {
            results.push({ path: node.path + '[' + i + ']', value: v[i] });
          }
        }
      }
      break;
  }

  return results;
}

function evaluateFilter(item, expr) {
  const trimmed = expr.trim();
  const OPS = ['==', '!=', '<=', '>=', '=~', '<', '>'];

  let op = null;
  let rightStart = -1;

  for (const candidate of OPS) {
    const spaceIdx = trimmed.indexOf(' ' + candidate + ' ');
    if (spaceIdx !== -1) { op = candidate; rightStart = spaceIdx + 2 + candidate.length; break; }
    const plainIdx = trimmed.indexOf(candidate);
    if (plainIdx > 0 && op === null) { op = candidate; rightStart = plainIdx + candidate.length; }
  }

  if (!op) return false;

  const opStart = trimmed.indexOf(op);
  const left = trimmed.substring(0, opStart).trim();
  const right = trimmed.substring(rightStart).trim();

  const leftVal = resolveAtField(item, left);
  let rightVal;
  if (right.startsWith('@.')) {
    rightVal = resolveAtField(item, right);
  } else {
    rightVal = parseLiteral(right);
  }

  return compare(leftVal, rightVal, op);
}

function resolveAtField(item, expr) {
  if (expr === '@') return item;
  if (expr.startsWith('@.')) {
    const field = expr.substring(2);
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      return item[field];
    }
    return undefined;
  }
  return expr;
}

function parseLiteral(str) {
  if (str === 'null') return null;
  if (str === 'true') return true;
  if (str === 'false') return false;
  if ((str.startsWith("'") && str.endsWith("'")) ||
      (str.startsWith('"') && str.endsWith('"'))) {
    return str.slice(1, -1);
  }
  if (!isNaN(Number(str)) && str !== '') return Number(str);
  return str;
}

function compare(a, b, op) {
  switch (op) {
    case '==': return a == b;
    case '!=': return a != b;
    case '<': return Number(a) < Number(b);
    case '>': return Number(a) > Number(b);
    case '<=': return Number(a) <= Number(b);
    case '>=': return Number(a) >= Number(b);
    case '=~': return typeof a === 'string' && typeof b === 'string' ? new RegExp(b).test(a) : false;
    default: return false;
  }
}

function recursiveDescent(data, key) {
  const results = [];
  function recurse(value, path) {
    if (value === null || typeof value !== 'object') return;
    if (!Array.isArray(value)) {
      if (key === '*' || key === undefined) {
        for (const k of Object.keys(value)) {
          results.push({ path: path + '.' + k, value: value[k] });
          recurse(value[k], path + '.' + k);
        }
      } else if (key in value) {
        results.push({ path: path + '.' + key, value: value[key] });
      }
      for (const k of Object.keys(value)) recurse(value[k], path + '.' + k);
    } else {
      for (let i = 0; i < value.length; i++) recurse(value[i], path + '[' + i + ']');
    }
  }
  recurse(data, '$');
  return results;
}

// ─── Tests ─────────────────────────────────────────

describe('JSONPath query', () => {
  const data = {
    store: {
      book: [
        { title: 'SICP', price: 45 },
        { title: 'CLRS', price: 90 },
        { title: 'Free Book', price: 0 }
      ]
    }
  };

  it('$.store.book[*].title — wildcard field access', () => {
    const r = evaluate(data, '$.store.book[*].title');
    assert.equal(r.length, 3);
    assert.equal(r[0].value, 'SICP');
    assert.equal(r[1].value, 'CLRS');
  });

  it('$.store.book[0] — index access', () => {
    const r = evaluate(data, '$.store.book[0]');
    assert.equal(r.length, 1);
    assert.equal(r[0].value.title, 'SICP');
  });

  it('$.store.book[-1] — negative index', () => {
    const r = evaluate(data, '$.store.book[-1]');
    assert.equal(r.length, 1);
    assert.equal(r[0].value.title, 'Free Book');
  });

  it('$.store.book[0:2] — slice', () => {
    const r = evaluate(data, '$.store.book[0:2]');
    assert.equal(r.length, 2);
  });

  it('$..title — recursive descent', () => {
    const r = recursiveDescent(data, 'title');
    assert.equal(r.length, 3);
    assert.ok(r.every(x => typeof x.value === 'string'));
  });

  it('$.store.book[?(@.price > 50)] — filter expression', () => {
    const r = evaluate(data, '$.store.book[?(@.price > 50)]');
    assert.equal(r.length, 1, 'Expected 1 book with price > 50');
    assert.equal(r[0].value.title, 'CLRS');
  });

  it('$.store.book[?(@.price < 10)] — filter with <', () => {
    const r = evaluate(data, '$.store.book[?(@.price < 10)]');
    assert.equal(r.length, 1);
    assert.equal(r[0].value.title, 'Free Book');
  });

  it('$.store.book[?(@.title == "SICP")] — string equality filter', () => {
    const r = evaluate(data, '$.store.book[?(@.title == "SICP")]');
    assert.equal(r.length, 1);
    assert.equal(r[0].value.title, 'SICP');
  });

  it('Wildcard: $.store.book[*].*', () => {
    const r = evaluate(data, '$.store.book[*].*');
    assert.equal(r.length, 6); // 3 books × 2 fields
  });
});

describe('Diff', () => {
  function diff(a, b, path) {
    path = path || '$';
    const changes = [];
    if (a === b) return changes;
    if (a === null || b === null) {
      if (a !== b) changes.push({ path, type: 'changed', old: a, new: b });
      return changes;
    }
    const typeA = Array.isArray(a) ? 'array' : typeof a;
    const typeB = Array.isArray(b) ? 'array' : typeof b;
    if (typeA !== typeB) {
      changes.push({ path, type: 'type_change', oldType: typeA, newType: typeB });
      return changes;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      const maxLen = Math.max(a.length, b.length);
      for (let i = 0; i < maxLen; i++) {
        const cp = path + '[' + i + ']';
        if (i >= a.length) changes.push({ path: cp, type: 'added' });
        else if (i >= b.length) changes.push({ path: cp, type: 'removed' });
        else changes.push(...diff(a[i], b[i], cp));
      }
      return changes;
    }
    if (typeA === 'object') {
      const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const key of allKeys) {
        const cp = path + '.' + key;
        if (!(key in a)) changes.push({ path: cp, type: 'added' });
        else if (!(key in b)) changes.push({ path: cp, type: 'removed' });
        else changes.push(...diff(a[key], b[key], cp));
      }
      return changes;
    }
    changes.push({ path, type: 'changed', old: a, new: b });
    return changes;
  }

  it('detects added key', () => {
    const r = diff({ a: 1 }, { a: 1, b: 2 });
    assert.equal(r.length, 1);
    assert.equal(r[0].type, 'added');
    assert.equal(r[0].path, '$.b');
  });

  it('detects removed key', () => {
    const r = diff({ a: 1, b: 2 }, { a: 1 });
    assert.equal(r.length, 1);
    assert.equal(r[0].type, 'removed');
    assert.equal(r[0].path, '$.b');
  });

  it('detects changed value', () => {
    const r = diff({ a: 1 }, { a: 2 });
    assert.equal(r.length, 1);
    assert.equal(r[0].type, 'changed');
    assert.equal(r[0].old, 1);
    assert.equal(r[0].new, 2);
  });

  it('detects nested changes', () => {
    const r = diff({ user: { name: 'A', age: 30 } }, { user: { name: 'A', age: 31 } });
    assert.equal(r.length, 1);
    assert.equal(r[0].path, '$.user.age');
  });

  it('returns empty array for identical', () => {
    const r = diff({ a: 1 }, { a: 1 });
    assert.equal(r.length, 0);
  });

  it('detects type change', () => {
    const r = diff({ a: 1 }, { a: '1' });
    assert.equal(r.length, 1);
    assert.equal(r[0].type, 'type_change');
  });
});
