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
import { activateLicenseSchema, activateLicense, licenseStatusSchema, licenseStatus, deactivateLicenseSchema, deactivateLicense } from './tools/license.js';
import { isActive, hasFeature } from './core/license.js';

// ─── Tool registry ─────────────────────────────────

const PRO_TOOLS = ['query_json', 'diff_json', 'convert_json'];

const tools = [
  // Free — always available
  { schema: formatJsonSchema, handler: formatJson, pro: false },
  { schema: minifyJsonSchema, handler: minifyJson, pro: false },
  { schema: validateJsonSchema, handler: validateJson, pro: false },
  { schema: searchJsonSchema, handler: searchJson, pro: false },
  // Pro — require license
  { schema: queryJsonSchema, handler: queryJson, pro: true },
  { schema: diffJsonSchema, handler: diffJson, pro: true },
  { schema: convertJsonSchema, handler: convertJson, pro: true },
  // License management
  { schema: activateLicenseSchema, handler: activateLicense, pro: false },
  { schema: licenseStatusSchema, handler: licenseStatus, pro: false },
  { schema: deactivateLicenseSchema, handler: deactivateLicense, pro: false },
];

// ─── Server setup ──────────────────────────────────

const server = new Server(
  { name: 'clearjson-mcp', version: '1.1.0' },
  { capabilities: { tools: {} } }
);

// List tools (always show all tools — even Pro ones — so agent knows they exist)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: tools.map(t => t.schema) };
});

// Call tool (gate Pro tools behind license)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const tool = tools.find(t => t.schema.name === name);

  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  // Gate Pro tools
  if (tool.pro && !isActive()) {
    return {
      content: [{
        type: 'text',
        text: `🔒 ${name} requires a Pro license.\n\n` +
          `Activate: use activate_license with your key (format: CLJ-XXXX-XXXX-XXXX)\n` +
          `Get a key: $29 lifetime at wayknow.tech/clearjson.html`
      }],
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
