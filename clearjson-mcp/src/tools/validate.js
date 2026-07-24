/**
 * validate_json — Validate a JSON string and return detailed diagnostics.
 */

import { parse } from '../core/parser.js';

export const validateJsonSchema = {
  name: 'validate_json',
  description: 'Validate a JSON string. Returns whether it is valid, and if not, the exact error location (line and column). ' +
    'Also returns stats: node count, max depth, file size, parse time.',
  inputSchema: {
    type: 'object',
    properties: {
      json: {
        type: 'string',
        description: 'The JSON string to validate.'
      }
    },
    required: ['json']
  }
};

export async function validateJson(args) {
  const { json } = args;

  if (typeof json !== 'string' || json.trim().length === 0) {
    return { content: [{ type: 'text', text: 'Error: `json` must be a non-empty string.' }], isError: true };
  }

  const result = parse(json);

  if (!result.ok) {
    // Show context around the error
    const lines = json.split('\n');
    const errLine = result.line;
    const contextStart = Math.max(1, errLine - 2);
    const contextEnd = Math.min(lines.length, errLine + 2);
    let context = '';
    for (let i = contextStart; i <= contextEnd; i++) {
      const marker = i === errLine ? '>>>' : '   ';
      const lineNum = String(i).padStart(String(contextEnd).length, ' ');
      const truncated = lines[i - 1].length > 120
        ? lines[i - 1].substring(0, 120) + '...'
        : lines[i - 1];
      context += `${marker} ${lineNum} | ${truncated}\n`;
    }

    return {
      content: [{
        type: 'text',
        text: `✗ Invalid JSON\n` +
          `  Error: ${result.error}\n` +
          `  Location: line ${result.line}, column ${result.column}\n\n` +
          `Context:\n${context}`
      }],
      isError: true
    };
  }

  const { nodes, maxDepth, sizeBytes, parseTimeMs } = result.stats;

  let text = `✓ Valid JSON\n`;
  text += `  Nodes: ${nodes.toLocaleString()}\n`;
  text += `  Max depth: ${maxDepth}\n`;
  text += `  Size: ${formatBytes(sizeBytes)}\n`;
  text += `  Parse time: ${parseTimeMs}ms\n`;

  // Top-level structure hint
  if (Array.isArray(result.data)) {
    text += `  Structure: Array[${result.data.length}]\n`;
  } else if (result.data !== null && typeof result.data === 'object') {
    text += `  Structure: Object{${Object.keys(result.data).length} keys}\n`;
  }

  return { content: [{ type: 'text', text }] };
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
