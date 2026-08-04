/**
 * ClearJSON Standalone Viewer — Phase 2
 *
 * Paste JSON, drag & drop files, load from disk.
 * Settings panel, theme selector, URL exclusion, Pro license activation.
 */

(function () {
  'use strict';

  var app, toolbar, main, statsBar, landing, treeView, rawView, settingsPage, proPage;
  var textarea, fileInput;

  var state = {
    parsedData: null,
    treeRoot: null,
    virtualTree: null,
    rawText: '',
    theme: 'dark',
    rawMode: false,
    searchResults: [],
    searchIndex: -1,
    settings: {}
  };

  var DEFAULT_SETTINGS = {
    theme: 'dark',
    indentSize: 20,
    initialDepth: 2,
    excludedURLs: [],
    shortcuts: {}
  };

  var SHORTCUT_DEFS = [
    { id: 'collapseAll', label: 'Collapse all',  defaultKey: '[', group: 'Navigation' },
    { id: 'expandAll',   label: 'Expand all',    defaultKey: ']', group: 'Navigation' },
    { id: 'cycleTheme',  label: 'Cycle theme',   defaultKey: 'd', group: 'Display' },
    { id: 'toggleRaw',   label: 'Toggle raw',    defaultKey: 'r', group: 'Display' },
    { id: 'searchNext',  label: 'Next search result',   defaultKey: 'Enter', group: 'Search' },
    { id: 'searchPrev',  label: 'Previous search result', defaultKey: 'Shift+Enter', group: 'Search' }
  ];

  // ================================================================
  //  INIT
  // ================================================================

  document.addEventListener('DOMContentLoaded', function () {
    cacheElements();
    bindEvents();
    loadSettings(function () {
      applyTheme();
      renderThemeGrid();
      renderShortcuts();
      renderURLList();
      checkProStatus();
      // Check hash for direct navigation
      if (window.location.hash === '#upgrade') showProPage();
      if (window.location.hash === '#settings') showSettingsPage();
    });
  });

  function cacheElements() {
    app = document.getElementById('clearjson-app');
    toolbar = document.getElementById('cj-toolbar');
    main = document.getElementById('cj-main');
    statsBar = document.getElementById('cj-stats-bar');
    landing = document.getElementById('cj-landing');
    treeView = document.getElementById('cj-tree-view');
    rawView = document.getElementById('cj-raw-view');
    settingsPage = document.getElementById('cj-settings-page');
    proPage = document.getElementById('cj-pro-page');
    textarea = document.getElementById('json-input');
    fileInput = document.getElementById('file-input');
  }

  function bindEvents() {
    // Format button
    document.getElementById('btn-format').addEventListener('click', function () {
      var text = textarea.value.trim();
      if (text) formatJSON(text);
    });

    // Clear
    document.getElementById('btn-clear').addEventListener('click', showLanding);

    // Back
    document.getElementById('btn-back').addEventListener('click', showLanding);

    // Load file
    document.getElementById('btn-load-file').addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', handleFileSelect);

    // Load sample data
    document.getElementById('btn-load-sample').addEventListener('click', function () {
      var sample = JSON.stringify({
        name: 'ClearJSON',
        version: '1.1.3',
        free: true,
        themes: ['dark', 'light', 'sepia', 'monokai', 'dracula'],
        stats: { users: 1234, rating: 4.8 },
        features: [
          { id: 1, name: 'Syntax Highlighting', free: true },
          { id: 2, name: 'Tree View', free: true },
          { id: 3, name: 'JWT Decoder', pro: true }
        ]
      }, null, 2);
      textarea.value = sample;
      formatJSON(sample);
    });

    // Copy
    document.getElementById('btn-copy').addEventListener('click', copyJSON);

    // Raw/Tree toggle
    document.getElementById('btn-raw').addEventListener('click', toggleView);

    // Theme
    document.getElementById('btn-theme').addEventListener('click', cycleTheme);

    // Export
    document.getElementById('btn-expand').addEventListener('click', function () {
      if (state.virtualTree) { state.virtualTree.expandAll(); }
      else if (state.treeRoot) ClearJSON.Tree.expandAll(state.treeRoot);
    });
    document.getElementById('btn-collapse').addEventListener('click', function () {
      if (state.virtualTree) { state.virtualTree.collapseAll(); }
      else if (state.treeRoot) ClearJSON.Tree.collapseAll(state.treeRoot);
    });
    document.getElementById('btn-export').addEventListener('click', showExportMenu);

    // Settings
    document.getElementById('btn-settings-view').addEventListener('click', function () {
      if (settingsPage.classList.contains('cj-hidden')) {
        showSettingsPage();
      } else {
        hideSettingsPage();
      }
    });
    document.getElementById('btn-close-settings').addEventListener('click', hideSettingsPage);
    document.getElementById('btn-save-settings').addEventListener('click', saveAllSettings);
    document.getElementById('btn-add-url').addEventListener('click', addURLPattern);

    // Pro page
    document.getElementById('btn-activate').addEventListener('click', activateLicense);
    var deactBtn = document.getElementById('btn-deactivate');
    if (deactBtn) deactBtn.addEventListener('click', deactivateLicense);

    // Search
    var searchInput = document.getElementById('cj-search-input');
    searchInput.addEventListener('input', function () { doSearch(this.value); });
    document.getElementById('btn-search-prev').addEventListener('click', function () { navigateSearch(-1); });
    document.getElementById('btn-search-next').addEventListener('click', function () { navigateSearch(1); });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });

    // Drop file anywhere on landing page
    landing.addEventListener('dragover', function (e) { e.preventDefault(); landing.classList.add('cj-drag-over'); });
    landing.addEventListener('dragleave', function () { landing.classList.remove('cj-drag-over'); });
    landing.addEventListener('drop', function (e) {
      e.preventDefault();
      landing.classList.remove('cj-drag-over');
      var file = e.dataTransfer.files[0];
      if (file) readFile(file);
    });

    // Paste anywhere on page → auto-format
    document.addEventListener('paste', function (e) {
      if (landing.classList.contains('cj-hidden')) return;
      if (e.target.tagName === 'INPUT') return;
      var text = (e.clipboardData || window.clipboardData).getData('text');
      if (text && text.trim()) {
        if (e.target.tagName === 'TEXTAREA') {
          // Pasting into textarea — auto-format after a short delay
          setTimeout(function () { formatJSON(textarea.value.trim()); }, 50);
        } else {
          textarea.value = text;
          formatJSON(text);
        }
      }
    });
  }

  // ================================================================
  //  CORE
  // ================================================================

  function formatJSON(text) {
    var sizeBytes = new Blob([text]).size;

    // Large files (>2MB) need Pro + streaming parser + virtual tree
    if (sizeBytes > 2 * 1024 * 1024) {
      if (!ClearJSON.License.isActive()) {
        showLargeFileGate(text);
        return;
      }
      formatLargeJSON(text, sizeBytes);
      return;
    }

    var result = ClearJSON.Parser.parse(text);
    if (!result.ok) { showError(result); return; }

    state.parsedData = result.data;
    state.virtualTree = null;
    state.rawText = text;
    state.rawMode = false;

    showResult(result);
  }

  function formatLargeJSON(text, sizeBytes) {
    hideAll();
    toolbar.classList.remove('cj-hidden');
    treeView.classList.remove('cj-hidden');
    rawView.classList.add('cj-hidden');

    treeView.innerHTML = '<div class="cj-streaming-status">Streaming parse…</div>';

    ClearJSON.StreamParser.parseLarge(text, function (progress) {
      treeView.innerHTML = '<div class="cj-streaming-status">Streaming parse… ' + Math.round(progress.percent) + '%</div>';
    }).then(function (result) {
      if (!result.ok) { showError(result); return; }

      var nodes = result.nodes;
      var maxDepth = 0;
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].depth > maxDepth) maxDepth = nodes[i].depth;
      }

      state.parsedData = null;
      state.rawText = text;
      state.rawMode = false;
      state.virtualTree = ClearJSON.VirtualTree.create(treeView, nodes, {
        initialDepth: state.settings.initialDepth
      });

      treeView.innerHTML = '';
      state.virtualTree.render();

      updateStats({ nodes: nodes.length, maxDepth: maxDepth, sizeBytes: sizeBytes }, text);
    }).catch(function (err) {
      showError({ ok: false, error: err.message || 'Streaming parse failed' });
    });
  }

  function showResult(result) {
    hideAll();
    toolbar.classList.remove('cj-hidden');
    treeView.classList.remove('cj-hidden');
    rawView.classList.add('cj-hidden');
    document.getElementById('btn-raw').textContent = 'Raw';
    document.getElementById('btn-raw').classList.remove('cj-hidden');
    // Update Pro button visibility
    checkToolbarProBtn();

    treeView.innerHTML = '';
    var rendered = ClearJSON.Tree.render(result.data, {
      initialDepth: state.settings.initialDepth || 2,
      indent: state.settings.indentSize || 20
    });
    state.treeRoot = rendered.element;
    treeView.appendChild(state.treeRoot);

    // Stats bar
    statsBar.classList.remove('cj-hidden');
    updateStats(result.stats);
  }

  function showLanding() {
    state.parsedData = null;
    state.treeRoot = null;
    state.virtualTree = null;
    state.rawText = '';
    state.rawMode = false;
    hideAll();
    toolbar.classList.add('cj-hidden');
    statsBar.classList.add('cj-hidden');
    landing.classList.remove('cj-hidden');
    treeView.innerHTML = '';
    rawView.innerHTML = '';
    document.getElementById('cj-search-input').value = '';
    document.getElementById('cj-search-count').textContent = '';
    window.location.hash = '';
  }

  function showLargeFileGate(text) {
    hideAll();
    toolbar.classList.add('cj-hidden');
    statsBar.classList.add('cj-hidden');
    treeView.classList.remove('cj-hidden');
    treeView.innerHTML = '';

    var sizeMB = (text.length / 1048576).toFixed(1);
    var box = document.createElement('div');
    box.className = 'cj-upgrade-box';
    box.innerHTML =
      '<div class="cj-upgrade-icon">⚠</div>' +
      '<h2>Large File — ' + sizeMB + ' MB</h2>' +
      '<p>This file may freeze your browser with the free viewer.</p>' +
      '<p><strong>ClearJSON Pro</strong> handles files up to 500 MB with virtual scrolling and streaming parser.</p>' +
      '<div class="cj-upgrade-actions">' +
        '<button class="cj-btn-primary" id="cj-btn-try">Try Anyway</button>' +
        '<button class="cj-btn-upgrade" id="cj-btn-go-pro">Upgrade to Pro — $29</button>' +
      '</div>';
    treeView.appendChild(box);

    document.getElementById('cj-btn-try').addEventListener('click', function () {
      treeView.innerHTML = '';
      // Force parse and hope for the best
      var result = ClearJSON.Parser.parse(text);
      if (result.ok) {
        state.parsedData = result.data;
        state.rawText = text;
        showResult(result);
      } else {
        showError(result);
      }
    });
    document.getElementById('cj-btn-go-pro').addEventListener('click', showProPage);
  }

  function toggleView() {
    if (!state.parsedData && !state.rawText) return;
    state.rawMode = !state.rawMode;

    if (state.rawMode) {
      treeView.classList.add('cj-hidden');
      var formatted = state.parsedData ? JSON.stringify(state.parsedData, null, 2) : state.rawText;
      rawView.innerHTML = ClearJSON.Tokenizer.toHTML(formatted, true);
      rawView.classList.remove('cj-hidden');
      document.getElementById('btn-raw').textContent = 'Tree';
    } else {
      rawView.classList.add('cj-hidden');
      treeView.classList.remove('cj-hidden');
      document.getElementById('btn-raw').textContent = 'Raw';
    }
  }

  function showError(result) {
    hideAll();
    toolbar.classList.remove('cj-hidden');
    document.getElementById('btn-raw').classList.add('cj-hidden');
    treeView.classList.remove('cj-hidden');
    treeView.innerHTML = '';

    var box = document.createElement('div');
    box.className = 'cj-error';
    box.innerHTML =
      '<div class="cj-error-icon">⚠</div>' +
      '<h2>Invalid JSON</h2>' +
      '<p>' + escapeHTML(result.error) + '</p>' +
      '<p class="cj-error-location">Line ' + result.line + ', Column ' + result.column + '</p>';
    treeView.appendChild(box);
    statsBar.classList.remove('cj-hidden');
    statsBar.innerHTML = '<span class="cj-stat-item cj-stat-error">Parse Error</span>';
  }

  // ================================================================
  //  SEARCH
  // ================================================================

  function doSearch(query) {
    state.searchResults = [];
    state.searchIndex = -1;
    clearHighlights();

    var countEl = document.getElementById('cj-search-count');
    if (!query || query.length < 2) { countEl.textContent = ''; return; }

    var nodes = document.querySelectorAll('.cj-value, .cj-key');
    var results = [];
    var pattern;
    try {
      pattern = new RegExp(escapeRegex(query), 'gi');
    } catch (e) { countEl.textContent = 'invalid'; return; }

    for (var i = 0; i < nodes.length; i++) {
      if (pattern.test(nodes[i].textContent || '')) {
        pattern.lastIndex = 0;
        results.push(nodes[i]);
        nodes[i].classList.add('cj-search-match');
      }
      pattern.lastIndex = 0;
    }

    state.searchResults = results;
    countEl.textContent = results.length ? results.length + ' match' + (results.length > 1 ? 'es' : '') : 'No matches';

    if (results.length > 0) {
      state.searchIndex = 0;
      highlightCurrentResult();
    }
  }

  function navigateSearch(dir) {
    if (!state.searchResults.length) return;
    state.searchIndex += dir;
    if (state.searchIndex >= state.searchResults.length) state.searchIndex = 0;
    if (state.searchIndex < 0) state.searchIndex = state.searchResults.length - 1;
    highlightCurrentResult();
  }

  function highlightCurrentResult() {
    var cur = document.querySelectorAll('.cj-search-current');
    for (var i = 0; i < cur.length; i++) cur[i].classList.remove('cj-search-current');
    if (state.searchIndex >= 0 && state.searchIndex < state.searchResults.length) {
      var el = state.searchResults[state.searchIndex];
      el.classList.add('cj-search-current');
      // Expand ancestors
      var p = el.closest('.cj-body');
      while (p) {
        if (p.classList.contains('cj-collapsed')) {
          p.classList.remove('cj-collapsed');
          var t = p.parentElement.querySelector('.cj-toggle');
          if (t && !t.classList.contains('cj-empty')) { t.classList.remove('cj-collapsed'); t.textContent = '▼'; }
        }
        p = p.parentElement.closest('.cj-body');
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function clearHighlights() {
    var m = document.querySelectorAll('.cj-search-match, .cj-search-current');
    for (var i = 0; i < m.length; i++) m[i].classList.remove('cj-search-match', 'cj-search-current');
  }

  // ================================================================
  //  EXPORT
  // ================================================================

  function showExportMenu() {
    if (!state.parsedData) { showToast('Nothing to export'); return; }

    var items = [
      { label: 'Copy as JSON', action: copyJSON },
      { label: 'Download JSON', action: function () {
        ClearJSON.Export.downloadFile(JSON.stringify(state.parsedData, null, 2), 'data.json', 'application/json');
      }}
    ];

    if (ClearJSON.License.isActive()) {
      items.push({ label: 'Export CSV', action: function () {
        var csv = ClearJSON.Export.toCSV(state.parsedData);
        if (csv) ClearJSON.Export.downloadFile(csv, 'data.csv', 'text/csv');
        else showToast('CSV export requires an array of objects');
      }});
      items.push({ label: 'Export TSV', action: function () {
        var tsv = ClearJSON.Export.toTSV(state.parsedData);
        if (tsv) ClearJSON.Export.downloadFile(tsv, 'data.tsv', 'text/tab-separated-values');
        else showToast('TSV export requires an array of objects');
      }});
      items.push({ label: 'Export TypeScript Types', action: function () {
        var ts = ClearJSON.Export.toTypeScript(state.parsedData, 'Root');
        ClearJSON.Export.downloadFile(ts, 'types.ts', 'text/typescript');
      }});
      items.push({ label: 'Export YAML', action: function () {
        var yaml = ClearJSON.Export.toYAML(state.parsedData);
        ClearJSON.Export.downloadFile(yaml, 'data.yaml', 'text/yaml');
      }});
    } else {
      items.push({ label: 'CSV → Download', action: function () { showProPage(); }, proOnly: true });
      items.push({ label: 'TSV → Download', action: function () { showProPage(); }, proOnly: true });
      items.push({ label: 'YAML → Download', action: function () { showProPage(); }, proOnly: true });
      items.push({ label: 'TypeScript Types → Download', action: function () { showProPage(); }, proOnly: true });
    }

    // Simple dropdown via a quick menu
    showQuickMenu(items);
  }

  function showQuickMenu(items) {
    var existing = document.querySelector('.cj-quick-menu');
    if (existing) existing.remove();

    var menu = document.createElement('div');
    menu.className = 'cj-quick-menu';

    var exportBtn = document.getElementById('btn-export');
    var rect = exportBtn.getBoundingClientRect();
    // Position near the Export button — requires JS, legitimate use of inline styles
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';

    items.forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'cj-menu-item';
      if (item.proOnly) {
        el.classList.add('cj-menu-item-pro');
        el.innerHTML = item.label + ' <span class="cj-pro-badge-inline">PRO</span>';
        el.title = 'Upgrade to ClearJSON Pro — $29 lifetime';
      } else {
        el.textContent = item.label;
      }
      el.addEventListener('click', function () {
        menu.remove();
        item.action();
      });
      menu.appendChild(el);
    });

    document.body.appendChild(menu);
    setTimeout(function () {
      document.addEventListener('click', function close() {
        if (menu.parentNode) menu.remove();
        document.removeEventListener('click', close);
      }, { once: true });
    }, 50);
  }

  function copyJSON() {
    if (!state.parsedData) return;
    var text = JSON.stringify(state.parsedData, null, 2);
    var btn = document.getElementById('btn-copy');
    navigator.clipboard.writeText(text).then(function () {
      var orig = btn.textContent;
      btn.textContent = '✓ Copied';
      btn.classList.add('cj-copied');
      setTimeout(function () {
        btn.textContent = orig;
        btn.classList.remove('cj-copied');
      }, 1500);
    });
  }

  // ================================================================
  //  SETTINGS
  // ================================================================

  function showSettingsPage() {
    hideAll();
    toolbar.classList.add('cj-hidden');
    settingsPage.classList.remove('cj-hidden');
    renderThemeGrid();
    renderURLList();
    window.location.hash = 'settings';
  }

  function hideSettingsPage() {
    settingsPage.classList.add('cj-hidden');
    if (state.parsedData) {
      toolbar.classList.remove('cj-hidden');
      treeView.classList.remove('cj-hidden');
      statsBar.classList.remove('cj-hidden');
    } else {
      landing.classList.remove('cj-hidden');
    }
    window.location.hash = '';
  }

  function renderThemeGrid() {
    var grid = document.getElementById('theme-grid');
    if (!grid) return;
    grid.innerHTML = '';

    var allThemes = ClearJSON.Themes.FREE_THEMES.concat(ClearJSON.Themes.PRO_THEMES);
    var isPro = ClearJSON.License.isActive();

    allThemes.forEach(function (name) {
      var chip = document.createElement('div');
      chip.className = 'cj-theme-chip';
      if (name === state.settings.theme) chip.classList.add('cj-active');

      var isProTheme = ClearJSON.Themes.PRO_THEMES.indexOf(name) !== -1;
      if (isProTheme && !isPro) {
        chip.classList.add('cj-pro-theme');
        chip.innerHTML = ClearJSON.Themes.getThemeLabel(name) + '<span class="cj-pro-badge">PRO</span>';
        chip.addEventListener('click', function () { showProPage(); });
      } else {
        chip.textContent = ClearJSON.Themes.getThemeLabel(name);
        chip.addEventListener('click', function () {
          state.settings.theme = name;
          applyTheme();
          renderThemeGrid();
          saveAllSettings();
        });
      }
      grid.appendChild(chip);
    });
  }

  function applyTheme() {
    app.className = 'cj-theme-' + state.settings.theme;
    document.getElementById('btn-theme').textContent = ClearJSON.Themes.getThemeLabel(state.settings.theme);

    // Update CSS variable injection
    var existing = document.getElementById('cj-theme-vars');
    if (existing) existing.remove();
    var style = document.createElement('style');
    style.id = 'cj-theme-vars';
    style.textContent = ClearJSON.Themes.getThemeCSS(state.settings.theme);
    document.head.appendChild(style);
  }

  function cycleTheme() {
    var themes = ClearJSON.License.isActive()
      ? ClearJSON.Themes.ALL_THEMES
      : ClearJSON.Themes.FREE_THEMES;
    var idx = themes.indexOf(state.settings.theme);
    if (idx === -1) idx = 0;
    state.settings.theme = themes[(idx + 1) % themes.length];
    applyTheme();
    saveAllSettings();
    showToast('Theme: ' + ClearJSON.Themes.getThemeLabel(state.settings.theme));
  }

  function renderShortcuts() {
    var table = document.getElementById('shortcuts-table');
    var group = document.getElementById('shortcuts-group');
    if (!table || !group) return;

    var isPro = ClearJSON.License.isActive();
    // Always show the shortcuts section — Pro users can edit, free users see a locked preview
    group.classList.remove('cj-hidden');

    if (!isPro) {
      // Show locked preview with upgrade prompt
      table.innerHTML = '';
      table.classList.add('cj-shortcuts-locked');
      var preview = document.createElement('div');
      preview.className = 'cj-shortcut-locked-preview';
      preview.innerHTML =
        '<p class="cj-pro-lock-msg">Custom keyboard shortcuts are a Pro feature</p>' +
        '<ul class="cj-shortcut-default-list">' +
        SHORTCUT_DEFS.map(function(d) {
          return '<li><kbd>' + escapeHTML(d.defaultKey) + '</kbd> — ' + escapeHTML(d.label) + '</li>';
        }).join('') +
        '</ul>' +
        '<button class="cj-btn-upgrade" id="cj-btn-upgrade-shortcuts">Upgrade to Pro — $29</button>';
      table.appendChild(preview);
      document.getElementById('cj-btn-upgrade-shortcuts').addEventListener('click', function () {
        hideSettingsPage();
        showProPage();
      });
      return;
    }

    table.classList.remove('cj-shortcuts-locked');
    table.innerHTML = '';
    var shortcuts = state.settings.shortcuts || {};
    var lastGroup = null;

    SHORTCUT_DEFS.forEach(function (def) {
      if (def.group !== lastGroup) {
        lastGroup = def.group;
        var hdr = document.createElement('div');
        hdr.className = 'cj-shortcut-group-header';
        hdr.textContent = def.group;
        table.appendChild(hdr);
      }

      var row = document.createElement('div');
      row.className = 'cj-shortcut-row';

      var label = document.createElement('span');
      label.className = 'cj-shortcut-label';
      label.textContent = def.label;
      row.appendChild(label);

      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'cj-shortcut-input';
      input.value = shortcuts[def.id] || def.defaultKey;
      input.dataset.shortcut = def.id;
      input.addEventListener('keydown', onShortcutKeyDown);
      input.addEventListener('blur', function () {
        if (!this.value.trim()) this.value = def.defaultKey;
      });
      row.appendChild(input);

      var defaultVal = document.createElement('span');
      defaultVal.className = 'cj-shortcut-default';
      defaultVal.textContent = def.defaultKey;
      row.appendChild(defaultVal);

      var resetBtn = document.createElement('button');
      resetBtn.className = 'cj-shortcut-reset';
      resetBtn.textContent = 'Reset';
      resetBtn.addEventListener('click', function () {
        input.value = def.defaultKey;
      });
      row.appendChild(resetBtn);

      table.appendChild(row);
    });
  }

  function onShortcutKeyDown(e) {
    e.preventDefault();
    var input = e.target;

    if (e.key === 'Backspace' || e.key === 'Delete') {
      input.value = '';
      return;
    }

    if (['Control', 'Shift', 'Alt', 'Meta'].indexOf(e.key) !== -1) return;

    var parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);

    input.value = parts.join('+');
  }

  function renderURLList() {
    var list = document.getElementById('url-list');
    if (!list) return;
    list.innerHTML = '';
    var urls = state.settings.excludedURLs || [];
    urls.forEach(function (url, i) {
      var row = document.createElement('div');
      row.className = 'cj-url-row';
      var input = document.createElement('input');
      input.type = 'text';
      input.value = url;
      input.placeholder = 'e.g. localhost:3000';
      input.addEventListener('input', function () {
        state.settings.excludedURLs[i] = input.value;
      });
      var del = document.createElement('button');
      del.textContent = '✕';
      del.addEventListener('click', function () {
        state.settings.excludedURLs.splice(i, 1);
        renderURLList();
      });
      row.appendChild(input);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  function addURLPattern() {
    if (!state.settings.excludedURLs) state.settings.excludedURLs = [];
    state.settings.excludedURLs.push('');
    renderURLList();
  }

  function saveAllSettings() {
    state.settings.indentSize = parseInt(document.getElementById('setting-indent').value) || 20;
    state.settings.initialDepth = parseInt(document.getElementById('setting-depth').value) || 2;

    // Collect custom shortcuts
    var shortcuts = {};
    var inputs = document.querySelectorAll('.cj-shortcut-input');
    inputs.forEach(function (input) {
      var id = input.dataset.shortcut;
      if (id && input.value.trim()) {
        shortcuts[id] = input.value.trim();
      }
    });
    state.settings.shortcuts = shortcuts;

    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ clearjson: state.settings });
    }
    showToast('Settings saved');
    hideSettingsPage();
  }

  // ================================================================
  //  PRO LICENSE
  // ================================================================

  function showProPage() {
    hideAll();
    toolbar.classList.add('cj-hidden');
    proPage.classList.remove('cj-hidden');
    checkProStatus();
    window.location.hash = 'upgrade';
  }

  function checkProStatus() {
    var active = ClearJSON.License.isActive();
    var section = document.getElementById('cj-license-section');
    var activeEl = document.getElementById('cj-pro-active');
    var proBtn = document.getElementById('btn-pro');

    if (active) {
      if (section) section.classList.add('cj-hidden');
      if (activeEl) {
        activeEl.classList.remove('cj-hidden');
        var info = ClearJSON.License.getInfo();
        document.getElementById('pro-active-info').textContent = info.keyPreview || '';
      }
      // Hide Pro upgrade button in toolbar
      if (proBtn) proBtn.classList.add('cj-hidden');
    } else {
      if (section) section.classList.remove('cj-hidden');
      if (activeEl) activeEl.classList.add('cj-hidden');
      // Show Pro upgrade button in toolbar
      if (proBtn) proBtn.classList.remove('cj-hidden');
    }
  }

  /**
   * Lightweight check — only toggles toolbar Pro button visibility.
   * Called from showResult (toolbar is hidden in showLanding, so no need there).
   */
  function checkToolbarProBtn() {
    var proBtn = document.getElementById('btn-pro');
    if (!proBtn) return;
    var active = ClearJSON.License.isActive();
    if (active) {
      proBtn.classList.add('cj-hidden');
    } else {
      proBtn.classList.remove('cj-hidden');
    }
  }

  function activateLicense() {
    var key = document.getElementById('license-key').value.trim();
    var statusEl = document.getElementById('license-status');

    if (!key) {
      statusEl.textContent = 'Enter a license key';
      statusEl.className = 'cj-license-status cj-status-error';
      return;
    }

    if (ClearJSON.License.storeLicense(key)) {
      statusEl.textContent = '✓ License activated! Pro features unlocked.';
      statusEl.className = 'cj-license-status cj-status-success';
      checkProStatus();
      renderThemeGrid();
      showToast('Pro activated!');
    } else {
      statusEl.textContent = 'Invalid license key';
      statusEl.className = 'cj-license-status cj-status-error';
    }
  }

  function deactivateLicense() {
    ClearJSON.License.removeLicense();
    checkProStatus();
    renderThemeGrid();
    showToast('Pro deactivated');
  }

  // ================================================================
  //  FILE HANDLING
  // ================================================================

  function handleFileSelect(e) {
    var file = e.target.files[0];
    if (file) readFile(file);
    fileInput.value = '';
  }

  function readFile(file) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      textarea.value = ev.target.result;
      formatJSON(ev.target.result);
    };
    reader.readAsText(file);
  }

  // ================================================================
  //  HELPERS
  // ================================================================

  function hideAll() {
    landing.classList.add('cj-hidden');
    settingsPage.classList.add('cj-hidden');
    if (proPage) proPage.classList.add('cj-hidden');
    treeView.classList.add('cj-hidden');
    rawView.classList.add('cj-hidden');
  }

  function updateStats(stats) {
    var items = [
      { label: 'Nodes', value: formatNumber(stats.nodes) },
      { label: 'Depth', value: String(stats.maxDepth) },
      { label: 'Size', value: formatBytes(stats.sizeBytes) },
      { label: 'Parse', value: stats.parseTimeMs + ' ms' }
    ];
    statsBar.innerHTML = '';
    items.forEach(function (item, i) {
      var el = document.createElement('span');
      el.className = 'cj-stat-item';
      el.innerHTML = '<span class="cj-stat-label">' + item.label + '</span> <span class="cj-stat-value">' + item.value + '</span>';
      statsBar.appendChild(el);
      if (i < items.length - 1) {
        var sep = document.createElement('span');
        sep.className = 'cj-stat-sep';
        statsBar.appendChild(sep);
      }
    });
  }

  function loadSettings(cb) {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('clearjson', function (data) {
        var saved = data && data.clearjson ? data.clearjson : {};
        var keys = Object.keys(DEFAULT_SETTINGS);
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          state.settings[k] = (saved[k] !== undefined) ? saved[k] : DEFAULT_SETTINGS[k];
        }
        state.theme = state.settings.theme || 'dark';
        // Set form values
        var indentSel = document.getElementById('setting-indent');
        var depthSel = document.getElementById('setting-depth');
        if (indentSel) indentSel.value = String(state.settings.indentSize || 20);
        if (depthSel) depthSel.value = String(state.settings.initialDepth || 2);
        cb();
      });
    } else {
      state.settings = Object.assign({}, DEFAULT_SETTINGS);
      state.theme = 'dark';
      cb();
    }
  }

  function showToast(msg) {
    var t = document.querySelector('.cj-toast');
    if (t) t.remove();
    var toast = document.createElement('div');
    toast.className = 'cj-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('cj-toast-out');
      setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
    }, 1500);
  }

  function formatBytes(b) { if (!b) return '0 B'; var k = 1024, s = ['B','KB','MB','GB'], i = Math.floor(Math.log(b)/Math.log(k)); return (b/Math.pow(k,i)).toFixed(i===0?0:1)+' '+s[i]; }
  function formatNumber(n) { return n < 1000 ? String(n) : n.toLocaleString('en-US'); }
  function escapeHTML(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
})();
