# ClearJSON

> Privacy-first, open-source browser JSON viewer. Zero tracking. Fully local.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

ClearJSON is a Chrome extension that automatically detects and formats JSON responses in your browser. Built in response to the [JSON Formatter controversy](https://news.ycombinator.com/item?id=47721946) — we will never inject ads, track you, or sell your data.

## Features

### Free (forever)
- ✅ Auto-detect & format JSON/JSON-LD/JSON:API/NDJSON
- ✅ Collapsible tree view with indent guides
- ✅ Syntax highlighting (strings, numbers, booleans, null)
- ✅ 3 themes (Dark, Light, Sepia) with system-follow
- ✅ Click-to-copy values, right-click for JSONPath
- ✅ Auto-detected links (clickable) and image previews
- ✅ Line numbers in raw view
- ✅ Stats bar (node count, depth, file size, parse time)
- ✅ Keyboard shortcuts (`[` collapse, `]` expand, `D` theme, `R` raw)
- ✅ 100% local processing — zero network requests
- ✅ MIT licensed, open source

### Pro ($29 lifetime)
- 💰 Large file virtual scrolling (100MB+ without freezing)
- 💰 Advanced search (regex, fuzzy match, result navigation)
- 💰 JWT auto-decode (header + payload inline)
- 💰 Multi-format export (CSV, TSV, YAML, XML, TypeScript types)
- 💰 30 premium themes (Monokai, Dracula, Nord, One Dark, Solarized, etc.)
- 💰 Custom keyboard shortcuts

## Install

### Chrome Web Store
*Coming soon*

### Load Unpacked (Development)
1. Clone this repo
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project folder

## Project Structure

```
clearjson/
├── manifest.json              # Chrome Extension manifest (MV3)
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
│       └── tree.js            # Interactive tree view renderer
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
```

### Phase 1 (current)
- [x] Project skeleton + manifest
- [x] JSON parser with error reporting
- [x] Syntax highlighting tokenizer
- [x] Interactive tree view renderer
- [x] Content script with detection + injection
- [x] 3 themes (dark, light, sepia)
- [x] Standalone viewer page
- [x] Extension popup
- [x] Icons

### Phase 2 (next)
- [ ] Image URL preview
- [ ] 10 free themes
- [ ] URL exclusion list
- [ ] Pro: large file virtual scrolling
- [ ] Pro: license activation

### Phase 3
- [ ] Pro: advanced search (regex)
- [ ] Pro: JWT decode
- [ ] Pro: multi-format export
- [ ] Pro: 30 themes
- [ ] Pro: custom shortcuts

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

## License

MIT — see [LICENSE](LICENSE) file.

## Why "ClearJSON"?

After the original JSON Formatter (2M+ users, 10 years open source) was sold and started injecting ads and tracking users, developers needed a trustworthy alternative. ClearJSON is built to be that alternative — open source from day one, with a sustainable Pro model that respects users instead of exploiting them.
