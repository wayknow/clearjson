/**
 * search_json — Search for keys, values, or paths in a JSON structure.
 *
 * Walks the entire tree and returns matching nodes with their JSONPath locations.
 * Handles large structures without crashing (streaming-like walk, early exit).
 */

import { parse } from '../core/parser.js';

export const searchJsonSchema = {
  name: 'search_json',
  description: 'Search for keys, values, or paths inside a JSON structure. ' +
    'Returns matching nodes with their JSONPath locations. ' +
    'Supports key search (field name contains), value search (value string contains), ' +
    'and path search (JSONPath contains). Respects maxResults limit (default 50).',
  inputSchema: {
    type: 'object',
    properties: {
      json: {
        type: 'string',
        description: 'The JSON string to search in.'
      },
      query: {
        type: 'string',
        description: 'The search term. Matches against keys, values, or paths depending on `mode`.'
      },
      mode: {
        type: 'string',
        enum: ['key', 'value', 'path', 'all'],
        description: 'Search mode: "key" (field names), "value" (string/number values), "path" (JSONPath), "all" (default — everything).',
        default: 'all'
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Case-sensitive search (default: false)',
        default: false
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return (default: 50)',
        default: 50
      }
    },
    required: ['json', 'query']
  }
};

export async function searchJson(args) {
  const { json, query, mode = 'all', caseSensitive = false, maxResults = 50 } = args;

  if (typeof json !== 'string' || json.trim().length === 0) {
    return { content: [{ type: 'text', text: 'Error: `json` must be a non-empty string.' }], isError: true };
  }

  if (!query || typeof query !== 'string') {
    return { content: [{ type: 'text', text: 'Error: `query` must be a non-empty string.' }], isError: true };
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

  const matches = [];
  const effectiveQuery = caseSensitive ? query : query.toLowerCase();

  function matchKey(key) {
    if (mode === 'value' || mode === 'path') return false;
    const k = caseSensitive ? key : key.toLowerCase();
    return k.indexOf(effectiveQuery) !== -1;
  }

  function matchValue(val) {
    if (mode === 'key' || mode === 'path') return false;
    if (typeof val === 'string') {
      const v = caseSensitive ? val : val.toLowerCase();
      return v.indexOf(effectiveQuery) !== -1;
    }
    if (typeof val === 'number') {
      return String(val).indexOf(effectiveQuery) !== -1;
    }
    return false;
  }

  function matchPath(path) {
    if (mode === 'key' || mode === 'value') return false;
    const p = caseSensitive ? path : path.toLowerCase();
    return p.indexOf(effectiveQuery) !== -1;
  }

  function walk(value, path, key) {
    if (matches.length >= maxResults) return;

    const matchesKey = key !== undefined && matchKey(key);
    const matchesValue = (typeof value !== 'object' || value === null) && matchValue(value);
    const matchesPath = matchPath(path);

    if (mode === 'all') {
      if (matchesKey || matchesValue || matchesPath) {
        matches.push(createMatch(value, path, key));
      }
    } else {
      if (matchesKey || matchesValue || matchesPath) {
        matches.push(createMatch(value, path, key));
      }
    }

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length && matches.length < maxResults; i++) {
        walk(value[i], path + '[' + i + ']', String(i));
      }
    } else if (value !== null && typeof value === 'object') {
      const keys = Object.keys(value);
      for (let i = 0; i < keys.length && matches.length < maxResults; i++) {
        const k = keys[i];
        walk(value[k], path + '.' + k, k);
      }
    }
  }

  function createMatch(value, path, key) {
    let displayValue;
    if (value === null) displayValue = 'null';
    else if (typeof value === 'object') {
      displayValue = Array.isArray(value)
        ? `Array[${value.length}]`
        : `Object{${Object.keys(value).length} keys}`;
    } else if (typeof value === 'string') {
      displayValue = value.length > 200 ? value.substring(0, 200) + '...' : value;
    } else {
      displayValue = String(value);
    }

    return { path, key: key || '', value: displayValue };
  }

  const rootName = Array.isArray(result.data) ? '$' : '$';
  if (Array.isArray(result.data)) {
    for (let i = 0; i < result.data.length && matches.length < maxResults; i++) {
      walk(result.data[i], '$[' + i + ']', String(i));
    }
  } else if (result.data !== null && typeof result.data === 'object') {
    const keys = Object.keys(result.data);
    for (let i = 0; i < keys.length && matches.length < maxResults; i++) {
      const k = keys[i];
      walk(result.data[k], '$.' + k, k);
    }
  }

  if (matches.length === 0) {
    return {
      content: [{ type: 'text', text: `No matches found for "${query}" (mode: ${mode}).` }]
    };
  }

  let text = `Found ${matches.length} match(es) for "${query}" (mode: ${mode}):\n\n`;
  for (const m of matches) {
    text += `  ${m.path}  →  ${m.value}\n`;
  }

  if (matches.length >= maxResults) {
    text += `\n(Results capped at ${maxResults}. Narrow your search to find more.)`;
  }

  return { content: [{ type: 'text', text }] };
}
