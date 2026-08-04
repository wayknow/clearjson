# Chrome Web Store — Listing Assets

> ✅ v1.1.2（UI 规范化）已提交审核：https://chromewebstore.google.com/detail/clearjson/bgcicghmdpefapfdeghgealacphkgobk
> $29 终身，Creem 外部支付 — v1.1.1 已于 2026-07-25 审核通过

## Title (优化版，待审核通过后替换)

ClearJSON: Privacy-First JSON Viewer & Formatter

## Short Description (优化版，≤132 chars)

JSON viewer & formatter with syntax highlighting, collapsible tree, and 10 themes. 100% local, no tracking. Pro adds large file virtual scrolling, JWT decode, regex search, and multi-format export.

## Detailed Description (优化版，待审核通过后替换)

ClearJSON is the trustworthy JSON viewer you've been looking for — built after popular JSON formatters went rogue with ads and tracking. All processing happens on your device. Period.

━━━━━━━━━━━━━━━━━━━━━━
✨ Why Switch to ClearJSON?
━━━━━━━━━━━━━━━━━━━━━━

• 100% Local — Every byte stays on your machine. Zero network requests.
• Privacy First — No analytics, no tracking, no accounts, no ads. Not now, not ever.
• Lightning Fast — Handles everything from tiny API responses to 500 MB data dumps with virtual scrolling (Pro).
• One-Time Purchase — $29 lifetime. No subscriptions. Covers 3 devices.

━━━━━━━━━━━━━━━━━━━━━━
🆓 Free Features (Forever)
━━━━━━━━━━━━━━━━━━━━━━

• Auto-detect & format JSON, JSON-LD, JSON:API, and NDJSON
• Collapsible tree view with indent guides and element counts
• Syntax highlighting — strings, numbers, booleans, null, keys, punctuation
• 10 built-in themes with automatic dark/light system-follow
• Click-to-copy values • Right-click for JSONPath or subtree
• Auto-detected clickable links • Hover-to-preview images (PNG/JPG/GIF/SVG/WebP)
• Line numbers in raw view
• Status bar — node count, max depth, file size, parse time
• Keyboard shortcuts: [ collapse, ] expand, D theme, R raw, / search
• Standalone viewer — paste, drag-and-drop, or load any JSON file
• URL exclusion list (regex) — skip sites with built-in JSON rendering

━━━━━━━━━━━━━━━━━━━━━━
💰 Pro ($29 Lifetime — No Subscription)
━━━━━━━━━━━━━━━━━━━━━━

• Large file virtual scrolling — 500 MB JSON without freezing (Web Worker + streaming parser)
• JWT auto-decode — detect eyJ... tokens, inline display header + payload, highlight expiry
• Advanced search — regex with match navigation and full-document highlighting
• Multi-format export — CSV, TSV, YAML, TypeScript type definitions (recursive inference)
• 20 premium themes — Monokai, Dracula, Nord, One Dark, Solarized, Catppuccin, GitHub, Tokyo Night, Gruvbox, and more
• Custom keyboard shortcuts — remap all 6 shortcuts to your preference

━━━━━━━━━━━━━━━━━━━━━━
🔓 How to Upgrade
━━━━━━━━━━━━━━━━━━━━━━

1. Click the Pro badge in the toolbar (or visit wayknow.tech/clearjson.html)
2. Complete checkout via Creem — your license key (CLJ-XXXX-XXXX-XXXX) arrives by email instantly
3. Paste the key in Settings → Pro → Activate. Works offline after first activation.

━━━━━━━━━━━━━━━━━━━━━━
🛡️ Permissions Explained
━━━━━━━━━━━━━━━━━━━━━━

• storage — Save your theme, settings, and license
• activeTab — Format JSON in the current tab only when you interact with the extension
• Host permission (file://) — Format local JSON files you open in Chrome
• Content scripts on JSON URLs — Detect and format JSON pages; page content is never read or transmitted

ClearJSON does not, and will never, make a network request for free users.
The Pro license verification is the ONLY network call, and only when activating or checking a key.

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
| 5 | `05-theme-grid.png` | Settings panel showing all 30 themes (10 free + 20 Pro) in a grid |

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

- **Homepage URL**: `https://wayknow.tech/clearjson.html`
- **Support URL**: `https://github.com/wayknow/clearjson/issues`
- **Privacy policy URL**: `https://wayknow.tech/clearjson-privacy.html`

---

## Pricing

- Free tier with core features (fully functional, no time limit)
- Pro: $29 USD one-time (lifetime), covers up to 3 devices
- **Payment via Creem (external checkout).** Chrome Web Store's own payments API was discontinued in 2021, so Pro is sold through Creem rather than in-store billing. Buy link: `https://www.creem.io/payment/prod_5Aha8NpKKi8AUd2sLaPRgM`
- Flow: purchase → license key emailed → activate in extension (Settings → Pro → paste key)

> ⚠️ CWS submission form: declare that the item **contains paid features** and set the "In-app purchases / paid features" disclosure. Since billing is external (Creem), there are no Google-managed IAP SKUs to configure — the disclosure + an accurate description are what's required.
