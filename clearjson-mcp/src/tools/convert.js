/**
 * convert_json — Convert JSON to CSV, TSV, YAML, or TypeScript type definitions.
 *
 * CSV/TSV: requires top-level array of objects.
 * YAML/TypeScript: works on any JSON structure.
 */

import { parse } from '../core/parser.js';
import { toCSV, toTSV, toYAML, toTypeScript } from '../core/exporter.js';

export const convertJsonSchema = {
  name: 'convert_json',
  description: 'Convert JSON to another format: CSV, TSV, YAML, or TypeScript type definitions. ' +
    'CSV/TSV requires a top-level array of objects. YAML and TypeScript work on any structure.',
  inputSchema: {
    type: 'object',
    properties: {
      json: {
        type: 'string',
        description: 'The JSON string to convert.'
      },
      format: {
        type: 'string',
        enum: ['csv', 'tsv', 'yaml', 'typescript'],
        description: 'Target format: "csv", "tsv", "yaml", or "typescript" (TypeScript interfaces).'
      },
      rootName: {
        type: 'string',
        description: 'Root type name for TypeScript conversion (default: "Root"). Ignored for other formats.',
        default: 'Root'
      }
    },
    required: ['json', 'format']
  }
};

export async function convertJson(args) {
  const { json, format: fmt, rootName = 'Root' } = args;

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

  const data = result.data;
  let output, label;

  switch (fmt) {
    case 'csv': {
      if (!Array.isArray(data)) {
        return { content: [{ type: 'text', text: 'CSV conversion requires a top-level JSON array of objects.' }], isError: true };
      }
      output = toCSV(data);
      if (!output) {
        return { content: [{ type: 'text', text: 'CSV conversion produced empty output. Ensure the array contains objects with consistent keys.' }], isError: true };
      }
      label = 'CSV';
      break;
    }
    case 'tsv': {
      if (!Array.isArray(data)) {
        return { content: [{ type: 'text', text: 'TSV conversion requires a top-level JSON array of objects.' }], isError: true };
      }
      output = toTSV(data);
      if (!output) {
        return { content: [{ type: 'text', text: 'TSV conversion produced empty output.' }], isError: true };
      }
      label = 'TSV';
      break;
    }
    case 'yaml': {
      output = toYAML(data);
      label = 'YAML';
      break;
    }
    case 'typescript': {
      output = toTypeScript(data, rootName);
      label = 'TypeScript';
      break;
    }
    default:
      return { content: [{ type: 'text', text: `Unknown format: "${fmt}". Use csv, tsv, yaml, or typescript.` }], isError: true };
  }

  const MAX_OUTPUT = 50000;
  let text = `Converted to ${label}:\n\n`;

  if (output.length <= MAX_OUTPUT) {
    return { content: [{ type: 'text', text: text + output }] };
  }

  return {
    content: [{
      type: 'text',
      text: text + output.substring(0, MAX_OUTPUT) +
        `\n\n... (truncated, ${output.length.toLocaleString()} chars total)`
    }]
  };
}
