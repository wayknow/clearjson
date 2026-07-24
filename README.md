# ClearJSON

[![npm version](https://img.shields.io/npm/v/clearjson-mcp)](https://www.npmjs.com/package/clearjson-mcp)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/bgcicghmdpefapfdeghgealacphkgobk)](https://chromewebstore.google.com/detail/clearjson/bgcicghmdpefapfdeghgealacphkgobk)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

> Privacy-first browser JSON viewer. Zero tracking. Fully local. Plus an MCP server for AI agents.

ClearJSON is a Chrome extension that automatically detects and formats JSON responses in your browser. Built in response to the [JSON Formatter controversy](https://news.ycombinator.com/item?id=47721946) — we will never inject ads, track you, or sell your data.

## MCP Server (New!)

For AI agents (Claude Code, etc.): `npx -y clearjson-mcp`

```json
{
  "mcpServers": {
    "clearjson": {
      "command": "npx",
      "args": ["-y", "clearjson-mcp"]
    }
  }
}
```

**10 tools** — format, validate, search, JSONPath query, deep diff, convert (CSV/TSV/YAML/TypeScript), plus license management. The only large-file-safe JSON MCP server. Available on [npm](https://www.npmjs.com/package/clearjson-mcp) and [mcp.so](https://mcp.so). See [AGENT_FIRST.md](AGENT_FIRST.md) for the full rationale.

## Features

### Free (forever)
- ✅ Auto-detect & format JSON/JSON-LD/JSON:API/NDJSON
- ✅ Collapsible tree view with indent guides
- ✅ Syntax highlighting (strings, numbers, booleans, null)
- ✅ 10 themes (Dark, Light, Sepia, Monokai, Dracula, Nord, One Dark, Solarized Light, GitHub, High Contrast)
- ✅ System-follow theme switching
- ✅ Click-to-copy values, right-click for JSONPath
- ✅ Auto-detected links (clickable) and image previews (hover)
- ✅ Line numbers in raw view
- ✅ Stats bar (node count, depth, file size, parse time)
- ✅ Keyboard shortcuts (`[` collapse, `]` expand, `D` theme, `R` raw, `Enter` search nav)
- ✅ Standalone viewer (paste JSON, drag-and-drop, file load)
- ✅ URL exclusion list (regex patterns)
- ✅ 100% local processing — zero network requests

### Pro ($29 lifetime)
- 💰 Large file virtual scrolling (100MB+ without freezing)
- 💰 Advanced search (regex, match highlighting, result navigation)
- 💰 JWT auto-decode (header + payload inline, expiry detection)
- 💰 Multi-format export (CSV, TSV, YAML, TypeScript types with recursive inference)
- 💰 30 premium themes (Catppuccin, Tokyo Night, Gruvbox, Nord, Dracula, Monokai…)
- 💰 Custom keyboard shortcuts (6 configurable bindings)

## Install

### Chrome Web Store
**[Install ClearJSON Free](https://chromewebstore.google.com/detail/clearjson/bgcicghmdpefapfdeghgealacphkgobk)**

### Load Unpacked (Development)
1. Clone this repo
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project folder

## Project Structure

```
clearjson/
├── manifest.json              # Chrome Extension manifest (MV3)
├── server/                    # License server (Cloudflare Worker + D1)
│   ├── src/index.js           # API: verify/generate/webhook/admin
│   ├── schema.sql             # D1 database schema
│   └── wrangler.toml          # Worker config
├── clearjson-mcp/             # MCP server (npm: clearjson-mcp)
│   ├── package.json
│   ├── src/
│   │   ├── index.js           # MCP entry point (stdio transport)
│   │   ├── core/              # Core logic (parser, exporter, license)
│   │   └── tools/             # 7 JSON tools + 3 license tools
│   ├── tests/                 # 49 MCP unit tests
│   └── README.md
├── src/
│   ├── content/
│   │   ├── content.js         # Content script (JSON detection + viewer injection)
│   │   └── content.css        # Base styles + CSS variable theming
│   ├── viewer/
│   │   ├── viewer.html        # Standalone viewer page
│   │   └── viewer.js          # Viewer logic
│   ├── popup/
│   │   ├── popup.html         # Extension toolbar popup
│   │   ├── popup.js
│   │   └── popup.css
│   └── utils/
│       ├── parser.js          # JSON detection + parsing
│       ├── tokenizer.js       # Syntax highlighting tokenizer
│       ├── themes.js          # 30 theme definitions
│       ├── license.js         # Pro license system
│       ├── export.js          # CSV/TSV/YAML/TypeScript export
│       ├── stream-parser.js   # Web Worker streaming parser
│       ├── virtual-tree.js    # Virtual scrolling tree view
│       └── tree.js            # Standard tree view renderer
├── tests/                     # 136 unit tests (Node built-in runner)
│   ├── helpers/setup.js
│   ├── test-parser.js
│   ├── test-tokenizer.js
│   ├── test-jwt.js
│   ├── test-license.js
│   └── test-export.js
├── test-data/                 # Test data + automation scripts
│   ├── complex-api-response.json
│   ├── jwt-test.json
│   ├── users-array.json
│   ├── large-array.json       # 2.2 MB for Pro gate testing
│   ├── server.js              # Local test server (port 8765)
│   ├── run-checklist.js       # 130-item static analysis
│   ├── browser-test.js        # 21-item browser automation
│   └── TEST-CHECKLIST.md      # 43-item manual checklist
├── icons/
│   ├── icon.svg
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Development

```bash
# For development, load the extension unpacked:
# 1. chrome://extensions/ → Developer mode ON
# 2. Load unpacked → select the project root
# 3. Edit files and click refresh on the extension card

# Run unit tests (zero dependencies, Node 18+):
npm test                    # 136 tests (Chrome extension)
cd clearjson-mcp && npm test   # 49 tests (MCP server)

# Run static analysis checklist (130 checks):
node test-data/run-checklist.js

# Run browser automation tests (requires puppeteer):
node test-data/browser-test.js

# Start local test server (Pro auto-enabled on localhost:8765):
node test-data/server.js
```

### Current Status (v1.1.1 — live on CWS)

All features implemented. Pro available via Creem ($29 lifetime).
136 unit tests passing. MCP server v1.1.0 published to npm.

See [STATUS.md](STATUS.md) for full project state, architecture decisions, and release checklist.

## Privacy

ClearJSON processes everything locally. We promise:

- ❌ No data sent anywhere
- ❌ No analytics or telemetry
- ❌ No tracking
- ❌ No ads
- ❌ No accounts
- ❌ No third-party scripts

Our permissions are minimal:
- `storage` — save your theme preference
- `activeTab` — format JSON in the current tab
- Host permissions — needed only to detect JSON content type; no page content is read on non-JSON pages

## Links

- Product page: [wayknow.tech/clearjson.html](https://wayknow.tech/clearjson.html)
- MCP Server: [npmjs.com/package/clearjson-mcp](https://www.npmjs.com/package/clearjson-mcp)
- Privacy policy: [wayknow.tech/clearjson-privacy.html](https://wayknow.tech/clearjson-privacy.html)
- Support: support@wayknow.tech

## Why "ClearJSON"?

After the original JSON Formatter (2M+ users, 10 years open source) was sold and started injecting ads and tracking users, developers needed a trustworthy alternative. ClearJSON is built to be that alternative with a sustainable Pro model that respects users instead of exploiting them.
