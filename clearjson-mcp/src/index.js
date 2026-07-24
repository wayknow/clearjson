#!/usr/bin/env node

/**
 * ClearJSON MCP Server
 *
 * Provides JSON formatting, validation, search, and conversion tools
 * to MCP-compatible agents (Claude Code, etc.) via stdio transport.
 *
 * The only large-file-safe JSON MCP — handles 100MB+ without crashing.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { formatJsonSchema, formatJson } from './tools/format.js';
import { minifyJsonSchema, minifyJson } from './tools/format.js';
import { validateJsonSchema, validateJson } from './tools/validate.js';
import { searchJsonSchema, searchJson } from './tools/search.js';
import { convertJsonSchema, convertJson } from './tools/convert.js';
import { queryJsonSchema, queryJson } from './tools/query.js';
import { diffJsonSchema, diffJson } from './tools/diff.js';

// ─── Tool registry ─────────────────────────────────

const tools = [
  { schema: formatJsonSchema, handler: formatJson },
  { schema: minifyJsonSchema, handler: minifyJson },
  { schema: validateJsonSchema, handler: validateJson },
  { schema: searchJsonSchema, handler: searchJson },
  { schema: queryJsonSchema, handler: queryJson },
  { schema: diffJsonSchema, handler: diffJson },
  { schema: convertJsonSchema, handler: convertJson },
];

// ─── Server setup ──────────────────────────────────

const server = new Server(
  { name: 'clearjson-mcp', version: '1.0.1' },
  { capabilities: { tools: {} } }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: tools.map(t => t.schema) };
});

// Call tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = tools.find(t => t.schema.name === name);

  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    return await tool.handler(args || {});
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Internal error in ${name}: ${err.message}` }],
      isError: true,
    };
  }
});

// ─── Start ─────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('ClearJSON MCP server failed to start:', err);
  process.exit(1);
});
