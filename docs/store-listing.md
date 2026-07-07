# Chrome Web Store — Listing Assets

## Short Description (≤132 chars)

> Privacy-first, open-source JSON viewer. Auto-formats JSON with syntax highlighting, collapsible trees, and search. Zero tracking. Fully local.

## Detailed Description

ClearJSON is the trustworthy JSON viewer you've been looking for — built in response to popular JSON formatters going rogue with ads and tracking.

### ✨ Why ClearJSON?

- **100% Local**: All processing happens on your device. Zero network requests for free users.
- **Open Source (MIT)**: Every line of code is public and auditable. No hidden surprises.
- **Privacy First**: No analytics, no tracking, no accounts, no ads. Ever.
- **Lightning Fast**: Optimized for both tiny API responses and 100MB+ data dumps.

### 🔧 Free Features (Forever)

- Auto-detect & format JSON, JSON-LD, JSON:API, and NDJSON
- Collapsible tree view with indent guides
- Syntax highlighting (strings, numbers, booleans, null, keys)
- 10 beautiful themes with system-follow (dark/light/sepia)
- Click-to-copy values, right-click for JSONPath
- Auto-detected links (clickable) and image previews (hover)
- Line numbers in raw view
- Stats bar (node count, depth, file size, parse time)
- Keyboard shortcuts (`[` collapse, `]` expand, `D` theme, `R` raw, `/` search)
- Standalone viewer — paste or drag-and-drop any JSON

### 💰 Pro Features ($29 Lifetime)

- **Large file virtual scrolling** — 100MB+ JSON without freezing
- **JWT auto-decode** — detect tokens and inline display header + payload
- **Advanced search** — regex, fuzzy match, result navigation
- **Multi-format export** — CSV, TSV, YAML, TypeScript types
- **30 premium themes** — Monokai, Dracula, Nord, One Dark, Solarized, and more
- **Custom keyboard shortcuts**

### 📦 One-Time Purchase. No Subscriptions.

$29 gets you ClearJSON Pro for life. No recurring fees, no accounts required.
A license covers up to 3 devices.

### 📖 Permissions Explained

- `storage` — Save your theme and settings
- `activeTab` — Format JSON in the current tab
- Host permissions — Only used to detect JSON content type; page content is never read otherwise

---

## Category

Developer Tools

## Keywords

JSON, JSON viewer, JSON formatter, JSON parser, pretty print, syntax highlighting,
tree view, developer tools, API debugger, JSON beautifier, JWT decoder, JSON to CSV

## Language

English

---

## Screenshots (Required: 1280×800)

All 5 screenshots are in `screenshots/` directory. Generated via `test-data/capture-screenshots.js`.

| # | File | Description |
|---|------|-------------|
| 1 | `01-dark-tree.png` | Complex JSON in Dark theme with collapsible tree and syntax highlighting |
| 2 | `02-light-search.png` | Light theme with search — matching keys & values highlighted |
| 3 | `03-array-data.png` | Large array of objects showing expanded tree structure |
| 4 | `04-raw-view.png` | Raw JSON view with syntax highlighting and line numbers |
| 5 | `05-theme-grid.png` | Settings panel with 10 free themes displayed in a grid |

### How to re-generate screenshots

```bash
node test-data/capture-screenshots.js
```

Requires Chrome installed at `/Applications/Google Chrome.app`.

For live screenshots (with real extension behavior):

1. Load the extension in Chrome
2. Open a JSON URL (e.g., `https://api.github.com/repos/wayknow/clearjson`)
3. Use Chrome DevTools → Device Toolbar → set to 1280×800
4. Capture full page screenshot (Cmd+Shift+P → "Capture full size screenshot")

---

## Promotional Images

All promo tiles are in `promo/` directory. HTML source files for editing, PNG renders for upload.

| Asset | Size | File |
|-------|------|------|
| Small tile | 440×280 | `promo/small-tile.png` |
| Large tile | 1400×560 | `promo/large-tile.png` |
| Marquee tile | 1400×560 | `promo/marquee-tile.png` |

### How to re-generate promo tiles

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --headless --disable-gpu --screenshot=promo/small-tile.png --window-size=440,280 \
  "file://$(pwd)/promo/small-tile.html"
# Repeat for large-tile.html (1400×560) and marquee-tile.html (1400×560)
```

---

## Additional Fields

- **Homepage URL**: `https://github.com/wayknow/clearjson`
- **Support URL**: `https://github.com/wayknow/clearjson/issues`
- **Privacy policy URL**: `https://wayknow.tech/clearjson-privacy.html`

---

## Pricing

- Free tier with core features
- Pro: $29 USD one-time (lifetime)
- Configured via Chrome Web Store Payments API or external payment (Creem)
