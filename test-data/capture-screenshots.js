/**
 * ClearJSON — Screenshot capture script
 *
 * Generates 1280×800 PNG screenshots for Chrome Web Store listing.
 * Uses Chrome headless to render the standalone viewer with sample data.
 *
 * Usage: node test-data/capture-screenshots.js
 * Output: screenshots/01-*.png through screenshots/05-*.png
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PROJECT = path.resolve(__dirname, '..');
const SCREENSHOTS = path.join(PROJECT, 'screenshots');
const WIDTH = 1280;
const HEIGHT = 800;

// Ensure screenshots directory exists
fs.mkdirSync(SCREENSHOTS, { recursive: true });

// ---- Sample data for screenshots ----
const sampleData = JSON.stringify({
  name: "ClearJSON",
  version: "1.0.0",
  description: "Privacy-first, open-source JSON viewer",
  repository: {
    type: "git",
    url: "https://github.com/wayknow/clearjson",
    stars: 1280,
    forks: 42,
    license: "MIT"
  },
  author: {
    name: "ClearJSON",
    email: "hello@wayknow.tech",
    verified: true
  },
  stats: {
    totalDownloads: 15420,
    activeUsers: 3890,
    averageRating: 4.8,
    reviews: [
      { user: "dev_jane", rating: 5, comment: "Finally a JSON viewer that respects privacy!" },
      { user: "backend_bob", rating: 5, comment: "Beautiful themes and super fast." },
      { user: "api_alice", rating: 4, comment: "Great tool, use it daily for debugging APIs." }
    ]
  },
  features: [
    "Auto-detect & format JSON pages",
    "Collapsible tree view with indent guides",
    "Syntax highlighting (keys, strings, numbers, booleans, null)",
    "10 beautiful themes (dark, light, sepia, high contrast…)",
    "Click-to-copy values, right-click for JSONPath",
    "Auto-detected links and image previews",
    "Search with result navigation",
    "Standalone viewer — paste or drop any JSON",
    "Line numbers in raw view",
    "Stats bar (nodes, depth, size, parse time)"
  ],
  config: {
    theme: "dark",
    indentSize: 2,
    initialExpandDepth: 2,
    showLineNumbers: true,
    showStatsBar: true,
    openSource: true,
    free: true
  },
  tags: ["json", "viewer", "formatter", "privacy", "open-source", "chrome-extension"]
}, null, 2);

// Large array data for a more impressive screenshot
const largeData = [];
for (let i = 0; i < 50; i++) {
  largeData.push({
    id: i + 1,
    name: `item_${i + 1}`,
    type: i % 3 === 0 ? "alpha" : i % 3 === 1 ? "beta" : "gamma",
    value: Math.round(Math.random() * 10000) / 100,
    active: i % 5 !== 0,
    metadata: {
      created: "2026-07-0" + ((i % 9) + 1),
      updated: "2026-07-07",
      tags: i % 2 === 0 ? ["important", "verified"] : ["pending"]
    }
  });
}
const largeSampleData = JSON.stringify(largeData, null, 2);

// ---- Build self-contained screenshot page ----
function buildScreenshotPage(dataJson, theme, initialState) {
  const escapedData = dataJson.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/<\/script>/g, '<\\/script>');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ClearJSON — Screenshot</title>
<link rel="stylesheet" href="file://${PROJECT}/src/content/content.css">
<style>
  body { margin: 0; padding: 0; background: #1e1e2e; }
  .cj-stats-bar { display: flex !important; }
</style>
</head>
<body>
<div id="clearjson-app" class="cj-theme-${theme}">
  <div id="cj-toolbar" class="cj-toolbar" style="display: flex;">
    <div class="cj-tb-left">
      <button class="cj-tb-btn" title="Collapse all">Collapse</button>
      <button class="cj-tb-btn" title="Expand all">Expand</button>
    </div>
    <div class="cj-tb-center">
      <div class="cj-search-wrap">
        <span class="cj-search-icon">🔍</span>
        <input type="text" class="cj-search-input" placeholder="Search keys & values…" spellcheck="false" value="${initialState === 'search' ? 'rating' : ''}">
        <span class="cj-search-count">${initialState === 'search' ? '3 matches' : ''}</span>
        <button class="cj-tb-btn cj-search-nav">▲</button>
        <button class="cj-tb-btn cj-search-nav">▼</button>
      </div>
    </div>
    <div class="cj-tb-right">
      <button class="cj-tb-btn" title="Toggle raw/tree view">${initialState === 'raw' ? 'Tree' : 'Raw'}</button>
      <button class="cj-tb-btn" title="Copy">Copy</button>
      <button class="cj-tb-btn" id="btn-export">Export</button>
      <button class="cj-tb-btn" title="Cycle theme">${theme === 'dark' ? 'Catppuccin Dark' : 'Catppuccin Light'}</button>
      <button class="cj-tb-btn">⚙</button>
    </div>
  </div>
  <div id="cj-tree-container" class="cj-tree-container">
    ${initialState === 'raw' ? '<pre id="cj-raw-view" class="cj-raw-view"></pre>' : ''}
  </div>
  <div id="cj-stats-bar" class="cj-stats-bar" style="display: flex;">
    <span class="cj-stat-item"><span class="cj-stat-label">Nodes</span> <span class="cj-stat-value">245</span></span>
    <span class="cj-stat-sep"></span>
    <span class="cj-stat-item"><span class="cj-stat-label">Depth</span> <span class="cj-stat-value">5</span></span>
    <span class="cj-stat-sep"></span>
    <span class="cj-stat-item"><span class="cj-stat-label">Size</span> <span class="cj-stat-value">3.2 KB</span></span>
    <span class="cj-stat-sep"></span>
    <span class="cj-stat-item"><span class="cj-stat-label">Parse</span> <span class="cj-stat-value">1.2 ms</span></span>
  </div>
</div>

<script>var RENDER_TEXT = \`${escapedData}\`;<${''}/script>
<script src="file://${PROJECT}/src/utils/parser.js"></script>
<script src="file://${PROJECT}/src/utils/tokenizer.js"></script>
<script src="file://${PROJECT}/src/utils/themes.js"></script>
<script src="file://${PROJECT}/src/utils/license.js"></script>
<script src="file://${PROJECT}/src/utils/export.js"></script>
<script src="file://${PROJECT}/src/utils/jwt.js"></script>
<script src="file://${PROJECT}/src/utils/stream-parser.js"></script>
<script src="file://${PROJECT}/src/utils/virtual-tree.js"></script>
<script src="file://${PROJECT}/src/utils/tree.js"></script>
<script>
(function() {
  var data = JSON.parse(RENDER_TEXT);
  var result = ClearJSON.Parser.parse(RENDER_TEXT);
  var rendered = ClearJSON.Tree.render(data, { initialDepth: 2, indent: 20 });
  var container = document.getElementById('cj-tree-container');
  ${initialState === 'raw'
    ? "var formatted = JSON.stringify(data, null, 2); document.getElementById('cj-raw-view').innerHTML = ClearJSON.Tokenizer.toHTML(formatted, true);"
    : "if (rendered && rendered.element) container.appendChild(rendered.element);"
  }
  // Inject theme CSS
  var style = document.createElement('style');
  style.textContent = ClearJSON.Themes.getThemeCSS('${theme}');
  document.head.appendChild(style);

  ${initialState === 'search' ? `
  // Highlight search matches
  setTimeout(function() {
    var nodes = document.querySelectorAll('.cj-value, .cj-key');
    var count = 0;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].textContent.indexOf('rating') !== -1) {
        nodes[i].classList.add('cj-search-match');
        if (count === 0) nodes[i].classList.add('cj-search-current');
        count++;
      }
    }
  }, 200);
  ` : ''}
})();
</script>
</body>
</html>`;
}

// ---- Capture screenshots ----
const screenshots = [
  {
    name: '01-dark-tree',
    desc: 'Complex JSON in Dark theme with collapsible tree and syntax highlighting',
    data: sampleData,
    theme: 'dark',
    state: 'tree'
  },
  {
    name: '02-light-search',
    desc: 'Light theme with search results highlighted',
    data: sampleData,
    theme: 'light',
    state: 'search'
  },
  {
    name: '03-array-data',
    desc: 'Large array data with expanded nodes showing structure',
    data: largeSampleData,
    theme: 'dark',
    state: 'tree'
  },
  {
    name: '04-raw-view',
    desc: 'Raw view with syntax highlighting and line numbers',
    data: sampleData,
    theme: 'dark',
    state: 'raw'
  },
  {
    name: '05-theme-grid',
    desc: 'Settings panel showing available free themes',
    data: sampleData,
    theme: 'dark',
    state: 'settings'
  }
];

console.log('Generating screenshots…\n');

for (const shot of screenshots) {
  const htmlPath = path.join(SCREENSHOTS, `_${shot.name}.html`);
  const pngPath = path.join(SCREENSHOTS, `${shot.name}.png`);

  let html;
  if (shot.state === 'settings') {
    html = buildSettingsPage(shot.theme);
  } else {
    html = buildScreenshotPage(shot.data, shot.theme, shot.state);
  }

  fs.writeFileSync(htmlPath, html);

  try {
    execSync(
      `"${CHROME}" --headless --disable-gpu --screenshot="${pngPath}" --window-size=${WIDTH},${HEIGHT} "file://${htmlPath}"`,
      { stdio: 'pipe', timeout: 15000 }
    );
    const size = fs.statSync(pngPath).size;
    console.log(`  ✓ ${shot.name}.png (${(size / 1024).toFixed(0)} KB) — ${shot.desc}`);
  } catch (err) {
    console.error(`  ✗ ${shot.name}.png FAILED:`, err.message);
  }

  // Clean up temp HTML
  fs.unlinkSync(htmlPath);
}

console.log('\nDone! Screenshots saved to screenshots/');

// ---- Settings page screenshot ----
function buildSettingsPage(theme) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ClearJSON — Settings</title>
<link rel="stylesheet" href="file://${PROJECT}/src/content/content.css">
<style>
  body { margin: 0; padding: 0; background: #1e1e2e; }
  .cj-settings-page { max-width: 640px; margin: 40px auto; padding: 32px; }
  .cj-settings-page h2 { font-size: 22px; margin-bottom: 24px; color: #cdd6f4; }
  .cj-settings-group { margin-bottom: 24px; }
  .cj-settings-group label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6c7086; margin-bottom: 8px; }
  .cj-settings-group select {
    width: 100%; padding: 10px 14px; font-family: inherit; font-size: 14px;
    color: #cdd6f4; background: #181825; border: 1px solid #45475a; border-radius: 8px;
  }
  .cj-theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
  }
  .cj-theme-chip {
    padding: 10px 14px; font-family: inherit; font-size: 13px; text-align: center;
    color: #bac2de; background: #181825;
    border: 2px solid #45475a; border-radius: 10px;
  }
  .cj-theme-chip.active {
    border-color: #89b4fa; color: #89b4fa; font-weight: 600;
    background: rgba(137, 180, 250, 0.08);
  }
  .theme-swatch {
    width: 100%; height: 20px; border-radius: 4px; margin-bottom: 6px;
  }
</style>
</head>
<body>
<div id="clearjson-app" class="cj-theme-${theme}">
  <div id="cj-toolbar" class="cj-toolbar" style="display: flex;">
    <div class="cj-tb-left">
      <button class="cj-tb-btn">← New</button>
    </div>
    <div class="cj-tb-center"></div>
    <div class="cj-tb-right">
      <button class="cj-tb-btn">⚙</button>
    </div>
  </div>
  <div class="cj-settings-page">
    <h2>Settings</h2>
    <div class="cj-settings-group">
      <label>Theme (10 Free Themes)</label>
      <div class="cj-theme-grid">
        <div class="cj-theme-chip active">
          <div class="theme-swatch" style="background: linear-gradient(135deg, #1e1e2e 50%, #cdd6f4 50%);"></div>
          Catppuccin Dark
        </div>
        <div class="cj-theme-chip">
          <div class="theme-swatch" style="background: linear-gradient(135deg, #eff1f5 50%, #4c4f69 50%);"></div>
          Catppuccin Light
        </div>
        <div class="cj-theme-chip">
          <div class="theme-swatch" style="background: linear-gradient(135deg, #282828 50%, #ebdbb2 50%);"></div>
          Gruvbox Dark
        </div>
        <div class="cj-theme-chip">
          <div class="theme-swatch" style="background: linear-gradient(135deg, #fbf1c7 50%, #3c3836 50%);"></div>
          Gruvbox Light
        </div>
        <div class="cj-theme-chip">
          <div class="theme-swatch" style="background: linear-gradient(135deg, #f5f0e8 50%, #1a1a2e 50%);"></div>
          Sepia
        </div>
        <div class="cj-theme-chip">
          <div class="theme-swatch" style="background: linear-gradient(135deg, #0d1117 50%, #c9d1d9 50%);"></div>
          GitHub Dark
        </div>
        <div class="cj-theme-chip">
          <div class="theme-swatch" style="background: linear-gradient(135deg, #fff 50%, #24292f 50%);"></div>
          GitHub Light
        </div>
        <div class="cj-theme-chip">
          <div class="theme-swatch" style="background: linear-gradient(135deg, #000 50%, #fff 50%);"></div>
          High Contrast
        </div>
        <div class="cj-theme-chip">
          <div class="theme-swatch" style="background: linear-gradient(135deg, #1a1b26 50%, #a9b1d6 50%);"></div>
          Tokyo Night
        </div>
        <div class="cj-theme-chip">
          <div class="theme-swatch" style="background: linear-gradient(135deg, #002b36 50%, #839496 50%);"></div>
          Solarized Dark
        </div>
      </div>
    </div>
    <div class="cj-settings-group">
      <label>Default Indent</label>
      <select>
        <option>2 spaces (compact)</option>
        <option selected>4 spaces (standard)</option>
        <option>8 spaces (wide)</option>
      </select>
    </div>
    <div class="cj-settings-group">
      <label>Initial Expand Depth</label>
      <select>
        <option>1 level</option>
        <option selected>2 levels</option>
        <option>3 levels</option>
        <option>All</option>
      </select>
    </div>
  </div>
</div>
</body>
</html>`;
}
