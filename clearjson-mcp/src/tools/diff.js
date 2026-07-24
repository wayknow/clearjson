/**
 * diff_json — Deep compare two JSON structures and produce a structured diff report.
 *
 * Detects:
 *   - Added keys (in b but not a)
 *   - Removed keys (in a but not b)
 *   - Changed values (same key, different value)
 *   - Type changes (same key, different type)
 *   - Array element changes (by index or by value equality)
 *
 * Pure function, no DOM dependencies.
 */

import { parse } from '../core/parser.js';

export const diffJsonSchema = {
  name: 'diff_json',
  description: 'Deep compare two JSON strings and produce a structured diff report. ' +
    'Detects added keys, removed keys, changed values, and type changes. ' +
    'Returns a list of differences with their JSONPath locations and old/new values.',
  inputSchema: {
    type: 'object',
    properties: {
      json_a: {
        type: 'string',
        description: 'The first (base/original) JSON string.'
      },
      json_b: {
        type: 'string',
        description: 'The second (new/modified) JSON string.'
      }
    },
    required: ['json_a', 'json_b']
  }
};

// ─── Diff Engine ───────────────────────────────────

/**
 * Deep diff two values. Returns an array of difference objects.
 */
function diff(a, b, path) {
  path = path || '$';
  const changes = [];

  // Same reference / primitive
  if (a === b) return changes;

  // Null handling
  if (a === null || b === null) {
    if (a !== b) {
      changes.push({ path, type: 'changed', old: a, new: b });
    }
    return changes;
  }

  // Type change
  const typeA = Array.isArray(a) ? 'array' : typeof a;
  const typeB = Array.isArray(b) ? 'array' : typeof b;

  if (typeA !== typeB) {
    changes.push({
      path,
      type: 'type_change',
      oldType: typeA,
      newType: typeB,
      old: summarize(a),
      new: summarize(b)
    });
    return changes;
  }

  // Both arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      const childPath = path + '[' + i + ']';
      if (i >= a.length) {
        changes.push({ path: childPath, type: 'added', old: undefined, new: summarize(b[i]) });
      } else if (i >= b.length) {
        changes.push({ path: childPath, type: 'removed', old: summarize(a[i]), new: undefined });
      } else {
        changes.push(...diff(a[i], b[i], childPath));
      }
    }
    return changes;
  }

  // Both objects
  if (typeA === 'object' && typeB === 'object') {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

    for (const key of allKeys) {
      const childPath = path + '.' + key;
      const inA = key in a;
      const inB = key in b;

      if (inA && !inB) {
        changes.push({ path: childPath, type: 'removed', old: summarize(a[key]), new: undefined });
      } else if (!inA && inB) {
        changes.push({ path: childPath, type: 'added', old: undefined, new: summarize(b[key]) });
      } else {
        changes.push(...diff(a[key], b[key], childPath));
      }
    }
    return changes;
  }

  // Both primitives, different values
  changes.push({ path, type: 'changed', old: a, new: b });
  return changes;
}

function summarize(val) {
  if (val === null) return null;
  if (val === undefined) return undefined;
  if (Array.isArray(val)) return `Array[${val.length}]`;
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    if (keys.length === 0) return '{}';
    if (keys.length <= 3) {
      return JSON.stringify(val).substring(0, 120);
    }
    return `Object{${keys.length} keys}`;
  }
  if (typeof val === 'string' && val.length > 200) {
    return val.substring(0, 200) + '...';
  }
  return val;
}

// ─── Tool Handler ──────────────────────────────────

export async function diffJson(args) {
  const { json_a, json_b } = args;

  if (typeof json_a !== 'string' || json_a.trim().length === 0) {
    return { content: [{ type: 'text', text: 'Error: `json_a` must be a non-empty JSON string.' }], isError: true };
  }
  if (typeof json_b !== 'string' || json_b.trim().length === 0) {
    return { content: [{ type: 'text', text: 'Error: `json_b` must be a non-empty JSON string.' }], isError: true };
  }

  const resultA = parse(json_a);
  if (!resultA.ok) {
    return {
      content: [{ type: 'text', text: `Parse error in json_a at line ${resultA.line}, column ${resultA.column}: ${resultA.error}` }],
      isError: true
    };
  }

  const resultB = parse(json_b);
  if (!resultB.ok) {
    return {
      content: [{ type: 'text', text: `Parse error in json_b at line ${resultB.line}, column ${resultB.column}: ${resultB.error}` }],
      isError: true
    };
  }

  const changes = diff(resultA.data, resultB.data);

  if (changes.length === 0) {
    return {
      content: [{ type: 'text', text: '✓ No differences found. The two JSON structures are identical.' }]
    };
  }

  // Categorize changes
  const added = changes.filter(c => c.type === 'added');
  const removed = changes.filter(c => c.type === 'removed');
  const changed = changes.filter(c => c.type === 'changed' || c.type === 'type_change');

  let text = `Found ${changes.length} difference(s):\n`;
  text += `  + ${added.length} added\n`;
  text += `  - ${removed.length} removed\n`;
  text += `  ~ ${changed.length} changed\n\n`;

  // Show added
  if (added.length > 0) {
    text += `── Added ──\n`;
    for (const c of added.slice(0, 30)) {
      text += `  + ${c.path}: ${formatValue(c.new)}\n`;
    }
    if (added.length > 30) text += `  ... and ${added.length - 30} more\n`;
    text += '\n';
  }

  // Show removed
  if (removed.length > 0) {
    text += `── Removed ──\n`;
    for (const c of removed.slice(0, 30)) {
      text += `  - ${c.path}: ${formatValue(c.old)}\n`;
    }
    if (removed.length > 30) text += `  ... and ${removed.length - 30} more\n`;
    text += '\n';
  }

  // Show changed
  if (changed.length > 0) {
    text += `── Changed ──\n`;
    for (const c of changed.slice(0, 30)) {
      if (c.type === 'type_change') {
        text += `  ~ ${c.path}: [${c.oldType}] ${formatValue(c.old)} → [${c.newType}] ${formatValue(c.new)}\n`;
      } else {
        text += `  ~ ${c.path}: ${formatValue(c.old)} → ${formatValue(c.new)}\n`;
      }
    }
    if (changed.length > 30) text += `  ... and ${changed.length - 30} more\n`;
  }

  const MAX_LEN = 50000;
  if (text.length > MAX_LEN) {
    text = text.substring(0, MAX_LEN) + `\n\n(Truncated — ${text.length.toLocaleString()} chars total.)`;
  }

  return { content: [{ type: 'text', text }] };
}

function formatValue(val) {
  if (val === undefined) return '(undefined)';
  if (val === null) return 'null';
  if (typeof val === 'string') {
    return val.length > 100 ? JSON.stringify(val.substring(0, 100)) + '...' : JSON.stringify(val);
  }
  if (typeof val === 'object') return JSON.stringify(val).substring(0, 120);
  return String(val);
}
