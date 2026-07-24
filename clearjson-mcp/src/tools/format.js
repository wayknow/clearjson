/**
 * format_json — Parse and pretty-print JSON with configurable indentation.
 * minify_json — Compress JSON to minimal form.
 */

import { parse, format } from '../core/parser.js';

export const formatJsonSchema = {
  name: 'format_json',
  description: 'Parse and pretty-print a JSON string with configurable indentation. ' +
    'Handles JSON of any size — the only MCP JSON tool that does not crash on 100MB+ files. ' +
    'Returns the formatted result along with stats (node count, depth, size, parse time).',
  inputSchema: {
    type: 'object',
    properties: {
      json: {
        type: 'string',
        description: 'The JSON string to format. Can be any size — large files are parsed in a worker-like pattern to avoid blocking.'
      },
      indent: {
        type: 'number',
        description: 'Number of spaces for indentation (default: 2)',
        default: 2
      }
    },
    required: ['json']
  }
};

export async function formatJson(args) {
  const { json, indent = 2 } = args;

  if (typeof json !== 'string' || json.trim().length === 0) {
    return { content: [{ type: 'text', text: 'Error: `json` must be a non-empty string.' }], isError: true };
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

  const formatted = format(result.data, indent);
  const { nodes, maxDepth, sizeBytes, parseTimeMs } = result.stats;

  let summary = `✓ Valid JSON\n`;
  summary += `  Nodes: ${nodes.toLocaleString()}\n`;
  summary += `  Max depth: ${maxDepth}\n`;
  summary += `  Size: ${formatBytes(sizeBytes)}\n`;
  summary += `  Parse time: ${parseTimeMs}ms\n`;
  if (sizeBytes > 2 * 1024 * 1024) {
    summary += `  (Large file handled without crashing)\n`;
  }
  summary += `\n`;

  // For small results, include the full formatted output.
  // For large results, truncate with a note.
  const MAX_OUTPUT = 50000;
  if (formatted.length <= MAX_OUTPUT) {
    return { content: [{ type: 'text', text: summary + formatted }] };
  }

  return {
    content: [{
      type: 'text',
      text: summary +
        `(Output truncated — ${formatted.length.toLocaleString()} chars total. ` +
        `First ${MAX_OUTPUT.toLocaleString()} chars shown.)\n\n` +
        formatted.substring(0, MAX_OUTPUT) + '\n\n... (truncated)'
    }]
  };
}

// ─── minify_json ───────────────────────────────────

export const minifyJsonSchema = {
  name: 'minify_json',
  description: 'Compress/minify a JSON string to its smallest valid form (no whitespace).',
  inputSchema: {
    type: 'object',
    properties: {
      json: {
        type: 'string',
        description: 'The JSON string to minify.'
      }
    },
    required: ['json']
  }
};

export async function minifyJson(args) {
  const { json } = args;

  if (typeof json !== 'string' || json.trim().length === 0) {
    return { content: [{ type: 'text', text: 'Error: `json` must be a non-empty string.' }], isError: true };
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

  const minified = JSON.stringify(result.data);
  const originalSize = Buffer.byteLength(json, 'utf8');
  const newSize = Buffer.byteLength(minified, 'utf8');
  const reduction = originalSize > 0 ? Math.round((1 - newSize / originalSize) * 100) : 0;

  const MAX_OUTPUT = 50000;
  const text = `✓ Minified (${formatBytes(originalSize)} → ${formatBytes(newSize)}, ${reduction}% reduction)\n\n`;

  if (minified.length <= MAX_OUTPUT) {
    return { content: [{ type: 'text', text: text + minified }] };
  }

  return {
    content: [{
      type: 'text',
      text: text + minified.substring(0, MAX_OUTPUT) +
        `\n\n... (truncated, ${minified.length.toLocaleString()} chars total)`
    }]
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
