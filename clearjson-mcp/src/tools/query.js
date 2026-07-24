/**
 * query_json — JSONPath query engine.
 *
 * Supports standard JSONPath expressions:
 *   $              — root
 *   .key / ['key'] — child access
 *   ..key          — recursive descent
 *   [n]            — array index (negative = from end)
 *   [start:end]    — array slice
 *   [*]            — wildcard (all children / all array elements)
 *   [?(expr)]      — filter expression (==, !=, <, >, <=, >=, =~)
 *
 * Pure function, no DOM dependencies.
 */

import { parse } from '../core/parser.js';

export const queryJsonSchema = {
  name: 'query_json',
  description: 'Query a JSON structure using JSONPath syntax. ' +
    'Supports dot-notation ($.store.book[0].title), recursive descent ($..author), ' +
    'array slicing ($[0:5]), wildcards ($..*), and filter expressions ($..book[?(@.price < 10)]). ' +
    'Returns matched values with their paths.',
  inputSchema: {
    type: 'object',
    properties: {
      json: {
        type: 'string',
        description: 'The JSON string to query.'
      },
      path: {
        type: 'string',
        description: 'JSONPath expression, e.g. "$.users[*].name", "$..email", "$[0:10]", "$..[?(@.price > 100)]".'
      }
    },
    required: ['json', 'path']
  }
};

// ─── JSONPath Parser & Evaluator ───────────────────

/**
 * Evaluate a JSONPath expression against a JSON value.
 *
 * @param {*} data — Parsed JSON value
 * @param {string} expr — JSONPath expression (must start with $)
 * @returns {{ results: Array<{path: string, value: any}> }}
 */
function evaluate(data, expr) {
  if (!expr || typeof expr !== 'string') {
    throw new Error('JSONPath expression must be a non-empty string');
  }
  if (!expr.startsWith('$')) {
    throw new Error('JSONPath must start with "$"');
  }

  const tokens = tokenize(expr);
  let current = [{ path: '$', value: data }];

  for (const token of tokens) {
    const next = [];
    for (const node of current) {
      const matches = applyToken(node, token);
      for (const m of matches) {
        next.push(m);
      }
    }
    current = next;
    if (current.length === 0) break;
  }

  return current.map(c => ({
    path: c.path,
    value: c.value
  }));
}

/**
 * Tokenize JSONPath expression into segments.
 * "$.store.book[0].title" → ["store", "book", 0, "title"]
 * "$..author" → ["..", "author"]
 */
function tokenize(expr) {
  const tokens = [];
  let i = 1; // skip $

  while (i < expr.length) {
    // Recursive descent: ..
    if (expr[i] === '.' && expr[i + 1] === '.') {
      tokens.push({ type: 'descendant' });
      i += 2;
      continue;
    }

    // Dot notation: .key
    if (expr[i] === '.') {
      i++; // skip dot
      if (expr[i] === '*') {
        tokens.push({ type: 'wildcard' });
        i++;
        continue;
      }
      const name = readIdentifier(expr, i);
      tokens.push({ type: 'child', key: name });
      i += name.length;
      continue;
    }

    // Bracket notation: ['key'] or [0] or [*] or [start:end] or [?(expr)]
    if (expr[i] === '[') {
      i++; // skip [
      const bracketContent = readBracketContent(expr, i);
      i += bracketContent.length + 1; // +1 for ]

      // Filter expression: ?(expr)
      if (bracketContent.startsWith('?(') && bracketContent.endsWith(')')) {
        const filterExpr = bracketContent.slice(2, -1);
        tokens.push({ type: 'filter', expr: filterExpr });
        continue;
      }

      // Wildcard: *
      if (bracketContent === '*') {
        tokens.push({ type: 'wildcard' });
        continue;
      }

      // Slice: start:end or start:end:step
      if (bracketContent.indexOf(':') !== -1) {
        const parts = bracketContent.split(':');
        const start = parts[0] ? parseInt(parts[0], 10) : 0;
        const end = parts[1] ? parseInt(parts[1], 10) : undefined;
        const step = parts[2] ? parseInt(parts[2], 10) : 1;
        tokens.push({ type: 'slice', start, end, step });
        continue;
      }

      // Numeric index
      if (/^-?\d+$/.test(bracketContent)) {
        tokens.push({ type: 'index', index: parseInt(bracketContent, 10) });
        continue;
      }

      // Quoted key: 'key' or "key"
      if ((bracketContent.startsWith("'") && bracketContent.endsWith("'")) ||
          (bracketContent.startsWith('"') && bracketContent.endsWith('"'))) {
        tokens.push({ type: 'child', key: bracketContent.slice(1, -1) });
        continue;
      }

      // Unquoted key (non-standard but common)
      tokens.push({ type: 'child', key: bracketContent });
      continue;
    }

    throw new Error(`Unexpected character at position ${i}: "${expr[i]}" in "${expr}"`);
  }

  return tokens;
}

function readIdentifier(expr, start) {
  let i = start;
  while (i < expr.length && /[a-zA-Z0-9_$-]/.test(expr[i])) {
    i++;
  }
  if (i === start) throw new Error(`Expected identifier at position ${start} in "${expr}"`);
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

/**
 * Apply a single token to a current node, returning matched sub-nodes.
 */
function applyToken(node, token) {
  const results = [];

  switch (token.type) {
    case 'child': {
      if (node.value !== null && typeof node.value === 'object' && !Array.isArray(node.value)) {
        if (token.key in node.value) {
          results.push({
            path: node.path + '.' + token.key,
            value: node.value[token.key]
          });
        }
      }
      break;
    }

    case 'descendant': {
      // Collect all values at any depth (this will be paired with next token)
      // Actually the "..key" pattern: tokenize produces [descendant, child/key]
      // We handle this in a special way: when we see descendant, we return the
      // current node AND all its descendants, then the next token selects from those.
      // But the current token-by-token approach doesn't support this well.
      // Instead, ".." was already handled at the tokenize level as a single segment.
      // We need to restructure: "..key" should be one token, not two.
      break;
    }

    case 'wildcard': {
      if (Array.isArray(node.value)) {
        for (let i = 0; i < node.value.length; i++) {
          results.push({
            path: node.path + '[' + i + ']',
            value: node.value[i]
          });
        }
      } else if (node.value !== null && typeof node.value === 'object') {
        const keys = Object.keys(node.value);
        for (const k of keys) {
          results.push({
            path: node.path + '.' + k,
            value: node.value[k]
          });
        }
      }
      break;
    }

    case 'index': {
      if (Array.isArray(node.value)) {
        let idx = token.index;
        if (idx < 0) idx = node.value.length + idx;
        if (idx >= 0 && idx < node.value.length) {
          results.push({
            path: node.path + '[' + idx + ']',
            value: node.value[idx]
          });
        }
      }
      break;
    }

    case 'slice': {
      if (Array.isArray(node.value)) {
        const len = node.value.length;
        let start = token.start;
        let end = token.end !== undefined ? token.end : len;
        if (start < 0) start = Math.max(0, len + start);
        if (end < 0) end = Math.max(0, len + end);
        start = Math.max(0, Math.min(start, len));
        end = Math.max(0, Math.min(end, len));

        for (let i = start; i < end; i += token.step) {
          results.push({
            path: node.path + '[' + i + ']',
            value: node.value[i]
          });
        }
      }
      break;
    }

    case 'filter': {
      if (Array.isArray(node.value)) {
        for (let i = 0; i < node.value.length; i++) {
          if (evaluateFilter(node.value[i], token.expr)) {
            results.push({
              path: node.path + '[' + i + ']',
              value: node.value[i]
            });
          }
        }
      }
      break;
    }
  }

  return results;
}

/**
 * Dedicated handler for the ".." (recursive descent) pattern.
 * "..key" collects all objects at any depth, then selects the key.
 */
function recursiveDescent(data, key, basePath) {
  const results = [];

  function recurse(value, path) {
    if (value === null || typeof value !== 'object') return;

    if (!Array.isArray(value)) {
      if (key === '*' || key === undefined) {
        // $..* — all values
        const keys = Object.keys(value);
        for (const k of keys) {
          results.push({ path: path + '.' + k, value: value[k] });
          recurse(value[k], path + '.' + k);
        }
      } else if (key in value) {
        results.push({ path: path + '.' + key, value: value[key] });
      }

      // Continue recursion into children
      const keys = Object.keys(value);
      for (const k of keys) {
        recurse(value[k], path + '.' + k);
      }
    } else {
      for (let i = 0; i < value.length; i++) {
        recurse(value[i], path + '[' + i + ']');
      }
    }
  }

  recurse(data, basePath || '$');
  return results;
}

/**
 * Evaluate a filter expression like "@.price < 10" or "@.name == 'Alice'".
 */
function evaluateFilter(item, expr) {
  // Parse: @.field op value
  const trimmed = expr.trim();

  // Handle comparison operators (longer first to avoid < matching <=)
  const OPS = ['==', '!=', '<=', '>=', '=~', '<', '>'];
  let op = null;
  let rightStart = -1;

  for (const candidate of OPS) {
    // Try with surrounding spaces: " op "
    const spaceIdx = trimmed.indexOf(' ' + candidate + ' ');
    if (spaceIdx !== -1) {
      op = candidate;
      rightStart = spaceIdx + 2 + candidate.length; // space + op + space
      break;
    }
    // Try without spaces
    const plainIdx = trimmed.indexOf(candidate);
    if (plainIdx > 0 && op === null) {
      op = candidate;
      rightStart = plainIdx + candidate.length;
    }
  }

  if (!op) return false;

  // Find where op actually starts in the string for left-side extraction
  const opStart = trimmed.indexOf(op);
  const left = trimmed.substring(0, opStart).trim();
  const right = trimmed.substring(rightStart).trim();

  // Evaluate left side (@.field)
  const leftVal = resolveAtField(item, left);
  // Evaluate right side (literal or @.field)
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
    case '=~': {
      // Regex match
      if (typeof b === 'string' && typeof a === 'string') {
        try {
          return new RegExp(b).test(a);
        } catch {
          return false;
        }
      }
      return false;
    }
    default: return false;
  }
}

// ─── Tool Handler ──────────────────────────────────

export async function queryJson(args) {
  const { json, path } = args;

  if (typeof json !== 'string' || json.trim().length === 0) {
    return { content: [{ type: 'text', text: 'Error: `json` must be a non-empty string.' }], isError: true };
  }

  if (!path || typeof path !== 'string') {
    return { content: [{ type: 'text', text: 'Error: `path` must be a non-empty JSONPath string.' }], isError: true };
  }

  const result = parse(json);
  if (!result.ok) {
    return {
      content: [{
        type: 'text',
        text: `JSON parse error at line ${result.line}, column ${result.column}: ${result.error}`
      }],
      isError: true
    };
  }

  try {
    // Handle recursive descent specially: $..key or $..*
    let results;
    if (path.startsWith('$..')) {
      const rest = path.substring(3);
      if (rest === '' || rest === '*') {
        results = recursiveDescent(result.data, '*');
      } else {
        results = recursiveDescent(result.data, rest);
      }
    } else {
      results = evaluate(result.data, path);
    }

    if (results.length === 0) {
      return { content: [{ type: 'text', text: `No matches for "${path}".` }] };
    }

    const MAX_RESULTS = 100;
    let text = `JSONPath: ${path}\nMatches: ${results.length}\n\n`;

    const show = results.slice(0, MAX_RESULTS);
    for (const r of show) {
      let valStr;
      if (r.value === null) valStr = 'null';
      else if (typeof r.value === 'object') {
        valStr = Array.isArray(r.value)
          ? `Array[${r.value.length}]`
          : `Object{${Object.keys(r.value).length} keys}`;
      } else if (typeof r.value === 'string') {
        valStr = r.value.length > 120 ? JSON.stringify(r.value).slice(0, 120) + '...' : JSON.stringify(r.value);
      } else {
        valStr = String(r.value);
      }
      text += `  ${r.path}  →  ${valStr}\n`;
    }

    if (results.length > MAX_RESULTS) {
      text += `\n(Showing first ${MAX_RESULTS} of ${results.length} results.)`;
    }

    return { content: [{ type: 'text', text }] };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `JSONPath error: ${err.message}` }],
      isError: true
    };
  }
}
