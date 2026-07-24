# ClearJSON MCP

> The only large-file-safe JSON MCP server. Format, validate, search, and convert JSON of any size — without crashing.

## Why

Other JSON MCP servers (`jsonfmt-mcp`, `json-forge-mcp`) use `JSON.parse()` on the full input. That crashes on large files. ClearJSON MCP handles 100MB+ JSON without breaking — the same battle-tested core that powers the [ClearJSON Chrome extension](https://chromewebstore.google.com/detail/clearjson/bgcicghmdpefapfdeghgealacphkgobk).

## Quick start

```bash
npx -y clearjson-mcp
```

Or add to your Claude Code config (`~/.claude/mcp.json`):

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

## Tools

### `format_json`
Parse and pretty-print JSON with configurable indentation. Returns stats (node count, depth, size, parse time). Handles files of any size.

```
→ { "name": "Alice", "age": 30 }
← ✓ Valid JSON
    Nodes: 3, Max depth: 2, Size: 213 B, Parse time: 0.05ms

    {
      "name": "Alice",
      "age": 30
    }
```

### `minify_json`
Compress JSON to its smallest valid form. Reports size reduction.

### `validate_json`
Validate JSON and get detailed diagnostics. On error, shows the exact line/column with surrounding context.

```
→ { "name": "Alice", "age": 30, }
← ✗ Invalid JSON
    Error: Unexpected token } at line 1, column 32
    Context:
      1 | { "name": "Alice", "age": 30, }
```

### `search_json`
Search for keys, values, or paths inside a JSON structure. Returns matching nodes with their JSONPath locations. Modes: `key`, `value`, `path`, `all`.

```
→ query: "email", mode: "key"
← Found 3 matches:
    $.users[0].email  →  "alice@example.com"
    $.users[1].email  →  "bob@example.com"
    $.config.notify.email  →  true
```

### `convert_json`
Convert JSON to CSV, TSV, YAML, or TypeScript type definitions. CSV/TSV require a top-level array of objects.

```
→ format: "typescript", json: { "user": { "name": "Alice", "age": 30 } }
← interface User {
      name: string;
      age: number;
    }
```

## Design

- **Zero backend** — Runs locally in the MCP client's process. No servers, no accounts, no telemetry.
- **Pure functions** — Core logic is extracted from the ClearJSON browser extension and made Node.js-compatible. No DOM, no browser APIs.
- **Large-file safe** — Uses the same parser architecture as ClearJSON Pro (streaming-capable). 100MB+ input is parsed without blocking.

## License

MIT
