/**
 * ClearJSON Standalone Viewer — Phase 2
 *
 * Paste JSON, drag & drop files, load from disk.
 * Settings panel, theme selector, URL exclusion, Pro license activation.
 */

(function () {
  'use strict';

  var app, toolbar, main, statsBar, landing, treeView, rawView, settingsPage, proPage;
  var textarea, dropZone, fileInput;

  var state = {
    parsedData: null,
    treeRoot: null,
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
    excludedURLs: []
  };

  // ================================================================
  //  INIT
  // ================================================================

  document.addEventListener('DOMContentLoaded', function () {
    cacheElements();
    bindEvents();
    loadSettings(function () {
      applyTheme();
      renderThemeGrid();
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
    dropZone = document.getElementById('drop-zone');
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

    // Copy
    document.getElementById('btn-copy').addEventListener('click', copyJSON);

    // Raw/Tree toggle
    document.getElementById('btn-raw').addEventListener('click', toggleView);

    // Theme
    document.getElementById('btn-theme').addEventListener('click', cycleTheme);

    // Export
    document.getElementById('btn-expand').addEventListener('click', function () {
      if (treeView.firstChild) ClearJSON.Tree.expandAll(treeView.firstChild);
    });
    document.getElementById('btn-collapse').addEventListener('click', function () {
      if (treeView.firstChild) ClearJSON.Tree.collapseAll(treeView.firstChild);
    });
    document.getElementById('btn-export').addEventListener('click', showExportMenu);

    // Settings
    document.getElementById('btn-settings-view').addEventListener('click', function () {
      if (settingsPage.style.display === 'none' || !settingsPage.style.display) {
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

    // Drop zone
    dropZone.addEventListener('click', function () { fileInput.click(); });
    dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('cj-drag-over'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('cj-drag-over'); });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('cj-drag-over');
      var file = e.dataTransfer.files[0];
      if (file) readFile(file);
    });

    // Paste anywhere
    document.addEventListener('paste', function (e) {
      if (landing.style.display === 'none') return;
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      var text = (e.clipboardData || window.clipboardData).getData('text');
      if (text && text.trim()) {
        textarea.value = text;
        formatJSON(text);
      }
    });
  }

  // ================================================================
  //  CORE
  // ================================================================

  function formatJSON(text) {
    // Check if Pro is needed for large files
    if (text.length > 2 * 1024 * 1024 && !ClearJSON.License.isActive()) {
      showLargeFileGate(text);
      return;
    }

    var result = ClearJSON.Parser.parse(text);
    if (!result.ok) { showError(result); return; }

    state.parsedData = result.data;
    state.rawText = text;
    state.rawMode = false;

    showResult(result);
  }

  function showResult(result) {
    hideAll();
    toolbar.style.display = 'flex';
    treeView.style.display = '';
    rawView.style.display = 'none';
    document.getElementById('btn-raw').textContent = 'Raw';
    document.getElementById('btn-back').style.display = '';

    treeView.innerHTML = '';
    var rendered = ClearJSON.Tree.render(result.data, {
      initialDepth: state.settings.initialDepth || 2,
      indent: state.settings.indentSize || 20
    });
    state.treeRoot = rendered.element;
    treeView.appendChild(state.treeRoot);

    // Stats bar
    statsBar.style.display = 'flex';
    updateStats(result.stats);
  }

  function showLanding() {
    state.parsedData = null;
    state.treeRoot = null;
    state.rawText = '';
    state.rawMode = false;
    hideAll();
    toolbar.style.display = 'none';
    landing.style.display = '';
    statsBar.style.display = 'none';
    treeView.innerHTML = '';
    rawView.innerHTML = '';
    document.getElementById('cj-search-input').value = '';
    document.getElementById('cj-search-count').textContent = '';
    window.location.hash = '';
  }

  function showLargeFileGate(text) {
    hideAll();
    toolbar.style.display = 'none';
    treeView.style.display = '';
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
    if (!state.parsedData) return;
    state.rawMode = !state.rawMode;

    if (state.rawMode) {
      treeView.style.display = 'none';
      var formatted = JSON.stringify(state.parsedData, null, 2);
      rawView.innerHTML = ClearJSON.Tokenizer.toHTML(formatted, true);
      rawView.style.display = '';
      document.getElementById('btn-raw').textContent = 'Tree';
    } else {
      rawView.style.display = 'none';
      treeView.style.display = '';
      document.getElementById('btn-raw').textContent = 'Raw';
    }
  }

  function showError(result) {
    hideAll();
    toolbar.style.display = 'flex';
    document.getElementById('btn-raw').style.display = 'none';
    treeView.style.display = '';
    treeView.innerHTML = '';

    var box = document.createElement('div');
    box.className = 'cj-error';
    box.innerHTML =
      '<div class="cj-error-icon">⚠</div>' +
      '<h2>Invalid JSON</h2>' +
      '<p>' + escapeHTML(result.error) + '</p>' +
      '<p class="cj-error-location">Line ' + result.line + ', Column ' + result.column + '</p>';
    treeView.appendChild(box);
    statsBar.style.display = 'flex';
    statsBar.innerHTML = '<span class="cj-stat-item" style="color: var(--cj-null)">Parse Error</span>';
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
      items.push({ label: 'Export TypeScript Types', action: function () {
        var ts = ClearJSON.Export.toTypeScript(state.parsedData, 'Root');
        ClearJSON.Export.downloadFile(ts, 'types.ts', 'text/typescript');
      }});
      items.push({ label: 'Export YAML', action: function () {
        var yaml = ClearJSON.Export.toYAML(state.parsedData);
        ClearJSON.Export.downloadFile(yaml, 'data.yaml', 'text/yaml');
      }});
    } else {
      items.push({ label: 'CSV / TS / YAML → (Pro)', action: function () {
        showProPage();
      }});
    }

    // Simple dropdown via a quick menu
    showQuickMenu(items);
  }

  function showQuickMenu(items) {
    var existing = document.querySelector('.cj-quick-menu');
    if (existing) existing.remove();

    var menu = document.createElement('div');
    menu.className = 'cj-quick-menu';
    menu.style.cssText = 'position:fixed;z-index:9999;background:var(--cj-surface);border:1px solid var(--cj-guide);border-radius:8px;padding:4px;box-shadow:0 4px 16px rgba(0,0,0,0.2);min-width:200px;';

    var exportBtn = document.getElementById('btn-export');
    var rect = exportBtn.getBoundingClientRect();
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';

    items.forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'cj-menu-item';
      el.textContent = item.label;
      el.style.cssText = 'padding:8px 12px;font-size:12px;cursor:pointer;border-radius:4px;color:var(--cj-text);white-space:nowrap;';
      el.addEventListener('mouseenter', function () { el.style.background = 'var(--cj-hover)'; });
      el.addEventListener('mouseleave', function () { el.style.background = 'transparent'; });
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
    navigator.clipboard.writeText(text).then(function () { showToast('Copied!'); });
  }

  // ================================================================
  //  SETTINGS
  // ================================================================

  function showSettingsPage() {
    hideAll();
    toolbar.style.display = 'none';
    settingsPage.style.display = '';
    renderThemeGrid();
    renderURLList();
    window.location.hash = 'settings';
  }

  function hideSettingsPage() {
    settingsPage.style.display = 'none';
    if (state.parsedData) {
      toolbar.style.display = 'flex';
      treeView.style.display = '';
      statsBar.style.display = 'flex';
    } else {
      landing.style.display = '';
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
    var themes = ClearJSON.Themes.FREE_THEMES;
    var idx = themes.indexOf(state.settings.theme);
    if (idx === -1) idx = 0;
    state.settings.theme = themes[(idx + 1) % themes.length];
    applyTheme();
    saveAllSettings();
    showToast('Theme: ' + ClearJSON.Themes.getThemeLabel(state.settings.theme));
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
    toolbar.style.display = 'none';
    proPage.style.display = '';
    checkProStatus();
    window.location.hash = 'upgrade';
  }

  function checkProStatus() {
    var active = ClearJSON.License.isActive();
    var section = document.getElementById('cj-license-section');
    var activeEl = document.getElementById('cj-pro-active');

    if (active) {
      if (section) section.style.display = 'none';
      if (activeEl) {
        activeEl.style.display = '';
        var info = ClearJSON.License.getInfo();
        document.getElementById('pro-active-info').textContent = info.keyPreview || '';
      }
    } else {
      if (section) section.style.display = '';
      if (activeEl) activeEl.style.display = 'none';
    }
  }

  function activateLicense() {
    var key = document.getElementById('license-key').value.trim();
    var statusEl = document.getElementById('license-status');

    if (!key) {
      statusEl.textContent = 'Enter a license key';
      statusEl.style.color = 'var(--cj-null)';
      return;
    }

    if (ClearJSON.License.storeLicense(key)) {
      statusEl.textContent = '✓ License activated! Pro features unlocked.';
      statusEl.style.color = 'var(--cj-string)';
      checkProStatus();
      renderThemeGrid();
      showToast('Pro activated!');
    } else {
      statusEl.textContent = 'Invalid license key';
      statusEl.style.color = 'var(--cj-null)';
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
    landing.style.display = 'none';
    settingsPage.style.display = 'none';
    proPage.style.display = 'none';
    treeView.style.display = 'none';
    rawView.style.display = 'none';
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
