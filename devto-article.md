# I Tested Every JSON Viewer After the Formatter Scandal. Here's What I Found.

Remember JSON Formatter? The Chrome extension with 200K+ users that auto-formatted JSON in your browser? In mid-2026 it went closed-source, partnered with GiveFreely, and started injecting geolocation tracking plus donation popups into checkout pages. The developer's defense was "it's for charity." The community's response was a collective "uninstall immediately."

I'm a developer. I look at JSON all day — API responses, config files, debug dumps. I needed a replacement. So I tested every major JSON viewer on the market.

## The Contenders

### JSON Formatter (arnav-kr) — The spiritual successor

This is the most popular open-source fork. 60+ themes, collapsible toolbar, keyboard shortcuts for everything.

**Good:** Truly open source. Actively maintained. Works offline. The free tier is generous.

**Catch:** No large file support. Above ~5MB it starts to struggle. No JWT decoding, no advanced export formats. If you just need basic formatting, it's perfect. If you work with bigger data, keep reading.

### JSON Viewer Pro (PatilWeb) — Power user's choice

300K+ users, 4.7 stars. Tree view, chart view, JSONPath with autocomplete, custom CSS. It's the most feature-rich free option.

**Good:** Breadcrumb navigation is genius. Chart visualization for numeric data. Active development (v7.1 as of October 2025).

**Catch:** Closed source. Smart UI is cool but sometimes doesn't trigger when you expect it to. Heavy — noticeably slower page loads on large JSON.

### JSON Alexander (Wes Bos) — The celebrity pick

Built by Wes Bos specifically in response to the Formatter scandal. Clean, minimal, trustworthy by association.

**Good:** Dead simple. Interactive tree, path inspection, dark/light/auto themes. Built by someone the community trusts.

**Catch:** Feature-light compared to others. No search. No export. No large file handling. It's a formatter, not a toolkit.

### JsonDiscovery — The different one

Instead of adding a toolbar, it transforms the entire page into an interactive explorer. Tree, table, and list views. Right-click context menus for copying paths and objects.

**Good:** Highest rated (4.88). Innovative UX. JORA query language with autocomplete.

**Catch:** Takes over the entire page — no way to see raw JSON side-by-side. Learning curve for the query syntax. Closed source.

### Firefox Built-in — The one you already have

If you use Firefox, you already have a JSON viewer. Collapsible tree, syntax highlighting, search. It's fine.

**Good:** Zero install. Zero trust issues (it's the browser). Always there.

**Catch:** Chrome users are out of luck. No themes. No copy-to-path. No export. It's a viewer, not a tool.

## The Pattern

| Dealbreaker | arnav-kr | PatilWeb | Wes Bos | JsonDiscovery | Firefox |
|---|---|---|---|---|---|
| No large file support | ✅ | | ✅ | | ✅ |
| Closed source | | ✅ | | ✅ | |
| Heavy / slow | | ✅ | | | |
| Too minimal | ✅ | | ✅ | | ✅ |
| Phones home? | ❌ | ? | ❌ | ? | ❌ |

**No tool was: fully open source + handles large files + privacy-guaranteed + feature-complete.**

## So I Built One

After two weeks of switching between tools depending on what I was doing, I built ClearJSON.

### What it does

**Formatting & Viewing:**
- Auto-detects JSON, JSON-LD, JSON:API, NDJSON — any JSON-like content type
- Collapsible tree view with indent guides, element counts, and depth indicators
- Syntax highlighting for all 7 JSON token types (strings, numbers, booleans, null, keys, punctuation, links)
- 10 free themes with automatic dark/light system following
- Click-to-copy values, right-click for JSONPath or subtree
- Auto-detected clickable links, hover-to-preview images (PNG/JPG/GIF/SVG/WebP)
- Line numbers in raw view, status bar with node count/max depth/file size/parse time

**Privacy — the reason I built it:**
- Zero network requests for free users. Not one. The extension has no analytics, no tracking, no accounts, no ads.
- The Pro license verification is the ONLY network call, and only when activating a key.
- All processing (parsing, formatting, rendering, search) happens on your device.

**Pro features ($29 lifetime, no subscription):**
- Virtual scrolling for 500 MB+ JSON files (Web Worker + streaming parser)
- JWT auto-decode — detects `eyJ...` tokens, inline displays header + payload, highlights expiry
- Regex search with match navigation and full-document highlighting
- Multi-format export: CSV, TSV, YAML, TypeScript type definitions (recursive inference)
- 20 additional premium themes (Monokai, Dracula, Nord, One Dark, Solarized, Catppuccin, Tokyo Night, Gruvbox, and more)
- Custom keyboard shortcuts

### The Tech Stack (for the curious)

- **Vanilla JS + IIFE module pattern.** Zero frameworks, zero build steps. 28 files, ~59KB zipped.
- **CSS variable-driven theming.** 30 themes defined as key-value pairs, injected at runtime via `<style>` tag.
- **Streaming parser (Pro):** Web Worker receives raw text in chunks, builds a flat node array, main thread renders only visible rows via virtual tree. 10,000+ nodes renders in under a second.
- **JWT decode:** Regex match → Base64Url decode (handles `-` → `+`, `_` → `/`, missing padding) → `JSON.parse` header/payload → inline render in tree view.
- **TypeScript type generation:** Recursive inference with duplicate structure deduplication. Generates proper `interface` blocks for nested objects.
- **License server:** Cloudflare Workers + D1 (SQLite). 7-day cache + offline fallback. Only called during key activation/verification.

### Honest Limitations

- Chrome/Edge only. No Firefox version yet (Manifest V3 vs V2 differences).
- Free tier limited to 2MB files. This is a deliberate choice — virtual scrolling is complex infrastructure, and it's how the Pro tier makes money.
- No JSONPath query. JSON Query Tool and JSON Viewer Pro already do this well for free. I'm not going to build a worse version just to check a box.
- No JSON Diff. Same reason — Just JSON and JsonKing do it better, for free.
- Still early. ~43 installs as of writing. The product is solid, the user base is not.

### Why $29 Lifetime?

JSON viewers have exactly zero marginal cost. No servers, no storage, no API calls. Charging a monthly subscription for one feels dishonest to me. The Pro tier unlocks features that took real engineering effort (virtual scrolling, streaming parser, JWT decode, multi-format export) — and a one-time payment reflects that value without the subscription fatigue.

---
**Try it:** [ClearJSON on Chrome Web Store](https://chromewebstore.google.com/detail/clearjson/bgcicghmdpefapfdeghgealacphkgobk) | [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/clearjson/kdebbkdldjhhboafpflimanekmhinelg)

**Source:** [github.com/wayknow/clearjson](https://github.com/wayknow/clearjson) (MIT)

*What are you using to view JSON? Did I miss a good one?*
