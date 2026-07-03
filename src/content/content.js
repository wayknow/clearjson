/**
 * ClearJSON Content Script
 *
 * Phase 2 — runs at document_start. Detects JSON and replaces raw text
 * with an interactive formatted tree view. Adds search, 10 themes,
 * image preview, URL exclusion.
 */

var ClearJSON = window.ClearJSON || {};

(function (C) {
  'use strict';

  // ================================================================
  //  CONFIGURATION
  // ================================================================

  var DEFAULT_SETTINGS = {
    theme: 'dark',
    indentSize: 20,
    initialDepth: 2,
    showLineNumbers: true,
    showStatsBar: true,
    excludedURLs: []
  };

  var state = {
    settings: null,
    parsedData: null,
    treeRoot: null,
    pathMap: null,
    rawMode: false,
    rawTextCache: null,
    searchResults: [],
    searchIndex: -1
  };

  var _initPollCount = 0;
  var _MAX_INIT_POLL = 300; // ~5s at 60fps — after that, give up

  // ================================================================
  //  DETECTION
  // ================================================================

  function detectJSON() {
    if (C.Parser.isJSONContentType(document.contentType)) return true;

    var body = document.body;
    if (!body) return false;

    var pre = body.querySelector('pre');
    if (pre) {
      var text = pre.textContent || '';
      if (text.length > 0 && C.Parser.looksLikeJSON(text)) return true;
    }

    var children = body.children;
    if (children.length === 0) {
      var bodyText = (body.textContent || '').trim();
      if (bodyText.length > 0 && C.Parser.looksLikeJSON(bodyText)) return true;
    }

    return false;
  }

  function getJSONText() {
    var pre = document.querySelector('pre');
    if (pre) return pre.textContent || '';
    var bodyText = (document.body.textContent || '').trim();
    if (C.Parser.looksLikeJSON(bodyText)) return bodyText;
    return '';
  }

  function isURLExcluded() {
    var excluded = state.settings.excludedURLs || [];
    var currentURL = window.location.href;
    for (var i = 0; i < excluded.length; i++) {
      try {
        if (new RegExp(excluded[i], 'i').test(currentURL)) return true;
      } catch (e) { /* skip invalid regex */ }
    }
    return false;
  }

  // ================================================================
  //  MAIN ENTRY POINT
  // ================================================================

  function init() {
    if (!document.body) {
      _initPollCount++;
      if (_initPollCount < _MAX_INIT_POLL) {
        requestAnimationFrame(init);
      }
      // If poll limit exceeded, silently give up — page likely isn't HTML
      return;
    }

    loadSettings(function (settings) {
      state.settings = settings;
      if (isURLExcluded()) return;
      if (!detectJSON()) return;

      var rawText = getJSONText();
      if (!rawText) return;

      // Check file size — if very large, show a warning (Pro gate)
      var sizeBytes = new Blob([rawText]).size;
      if (sizeBytes > 2 * 1024 * 1024 && !isProActive()) {
        showLargeFileWarning(rawText, sizeBytes);
        return;
      }

      var result = C.Parser.parse(rawText);
      if (!result.ok) { showError(result); return; }

      state.parsedData = result.data;
      buildViewer(result.data, result.stats, rawText);
    });
  }

  // ================================================================
  //  PRO GATE (placeholder — real validation in license.js)
  // ================================================================

  function isProActive() {
    if (C.License && C.License.isActive()) return true;
    // Dev mode: auto-enable Pro on test server (no manual console needed)
    if (window.location.hostname === 'localhost' && window.location.port === '8765') return true;
    try {
      return localStorage.getItem('clearjson_pro_dev') === '1';
    } catch (e) { return false; }
  }

  function showLargeFileWarning(rawText, sizeBytes) {
    var theme = (C.Themes.THEMES[state.settings.theme] || C.Themes.THEMES['dark']);
    var themeBg = theme.bg || '#1e1e2e';

    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.title = 'ClearJSON — Large File';

    document.body.style.backgroundColor = themeBg;
    injectThemeVars();

    var sizeStr = sizeBytes > 1048576
      ? (sizeBytes / 1048576).toFixed(1) + ' MB'
      : (sizeBytes / 1024).toFixed(0) + ' KB';

    var wrapper = document.createElement('div');
    wrapper.id = 'clearjson-app';
    wrapper.className = 'cj-theme-' + state.settings.theme;

    var box = document.createElement('div');
    box.className = 'cj-upgrade-box';
    box.innerHTML =
      '<div class="cj-upgrade-icon">⚠</div>' +
      '<h2>Large File Detected</h2>' +
      '<p>This JSON file is <strong>' + sizeStr + '</strong>.</p>' +
      '<p>Free viewers may freeze or crash on files this large.</p>' +
      '<p style="margin-bottom:16px"><strong>ClearJSON Pro</strong> handles files up to 500 MB with zero lag — virtual scrolling and streaming parser.</p>' +
      '<div class="cj-upgrade-actions">' +
        '<button class="cj-btn-primary" id="cj-btn-try-parse">Try Anyway</button>' +
        '<button class="cj-btn-upgrade" id="cj-btn-upgrade">Learn About Pro</button>' +
      '</div>';

    wrapper.appendChild(box);
    document.body.appendChild(wrapper);

    document.getElementById('cj-btn-try-parse').addEventListener('click', function () {
      var result = C.Parser.parse(rawText);
      if (result.ok) {
        state.parsedData = result.data;
        buildViewer(result.data, result.stats, rawText);
      } else {
        showError(result);
      }
    });

    document.getElementById('cj-btn-upgrade').addEventListener('click', function () {
      // Open upgrade page
      if (chrome && chrome.tabs) {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/viewer/viewer.html#upgrade') });
      }
    });
  }

  // ================================================================
  //  VIEWER CONSTRUCTION
  // ================================================================

  function buildViewer(data, stats, rawText) {
    // Prevent white flash: capture theme bg before clearing head
    var theme = (C.Themes.THEMES[state.settings.theme] || C.Themes.THEMES['dark']);
    var themeBg = theme.bg || '#1e1e2e';

    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.title = 'ClearJSON — Viewer';

    // Set body bg immediately so there's no white flash before wrapper is appended
    document.body.style.backgroundColor = themeBg;

    injectThemeVars();

    var wrapper = document.createElement('div');
    wrapper.id = 'clearjson-app';
    wrapper.className = 'cj-theme-' + state.settings.theme;

    // Toolbar with search
    wrapper.appendChild(buildToolbar());

    // Tree view container
    var treeContainer = document.createElement('div');
    treeContainer.id = 'cj-tree-container';
    treeContainer.className = 'cj-tree-container';

    var rendered = C.Tree.render(data, {
      initialDepth: state.settings.initialDepth,
      indent: state.settings.indentSize
    });

    state.treeRoot = rendered.element;
    state.pathMap = rendered.pathMap;
    treeContainer.appendChild(state.treeRoot);
    wrapper.appendChild(treeContainer);

    // Stats bar
    if (state.settings.showStatsBar) {
      wrapper.appendChild(buildStatsBar(stats, rawText));
    }

    document.body.appendChild(wrapper);
    bindKeyboardShortcuts();

    // Focus the search input
    setTimeout(function () {
      var si = document.getElementById('cj-search-input');
      if (si) si.focus();
    }, 100);

    document.body.setAttribute('data-clearjson', 'true');
  }

  // ================================================================
  //  TOOLBAR (updated with search)
  // ================================================================

  function buildToolbar() {
    var tb = document.createElement('div');
    tb.id = 'cj-toolbar';
    tb.className = 'cj-toolbar';

    // Left
    var left = document.createElement('div');
    left.className = 'cj-tb-left';
    left.appendChild(createBtn('▹▹ Collapse', 'collapse', function () { C.Tree.collapseAll(state.treeRoot); }));
    left.appendChild(createBtn('◁◁ Expand', 'expand', function () { C.Tree.expandAll(state.treeRoot); }));
    tb.appendChild(left);

    // Center: search
    var center = document.createElement('div');
    center.className = 'cj-tb-center';
    var searchWrap = document.createElement('div');
    searchWrap.className = 'cj-search-wrap';

    var searchIcon = document.createElement('span');
    searchIcon.className = 'cj-search-icon';
    searchIcon.textContent = '🔍';

    var searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'cj-search-input';
    searchInput.className = 'cj-search-input';
    searchInput.placeholder = 'Search keys & values…';
    searchInput.setAttribute('spellcheck', 'false');

    var searchCount = document.createElement('span');
    searchCount.id = 'cj-search-count';
    searchCount.className = 'cj-search-count';

    var searchPrev = document.createElement('button');
    searchPrev.className = 'cj-tb-btn cj-search-nav';
    searchPrev.textContent = '▲';
    searchPrev.title = 'Previous match';
    searchPrev.addEventListener('click', function () { navigateSearch(-1); });

    var searchNext = document.createElement('button');
    searchNext.className = 'cj-tb-btn cj-search-nav';
    searchNext.textContent = '▼';
    searchNext.title = 'Next match';
    searchNext.addEventListener('click', function () { navigateSearch(1); });

    // Regex toggle (Pro feature)
    var regexBtn = document.createElement('button');
    regexBtn.id = 'cj-search-regex';
    regexBtn.className = 'cj-tb-btn';
    regexBtn.textContent = '.*';
    regexBtn.title = 'Regex mode (Pro)';
    regexBtn.addEventListener('click', function () {
      if (!isProActive()) {
        showToast('Regex search is a Pro feature');
        return;
      }
      var active = regexBtn.classList.toggle('cj-active');
      doSearch(searchInput.value, active);
    });

    searchWrap.appendChild(searchIcon);
    searchWrap.appendChild(searchInput);
    searchWrap.appendChild(searchCount);
    searchWrap.appendChild(searchPrev);
    searchWrap.appendChild(searchNext);
    if (isProActive()) searchWrap.appendChild(regexBtn);
    center.appendChild(searchWrap);
    tb.appendChild(center);

    // Right
    var right = document.createElement('div');
    right.className = 'cj-tb-right';
    right.appendChild(createBtn('Raw', 'raw', toggleRawView));
    right.appendChild(createBtn('Copy', 'copy', copyFullJSON));
    var themeLabel = C.Themes.getThemeLabel(state.settings.theme);
    var themeBtn = createBtn(themeLabel, 'theme', cycleTheme);
    right.appendChild(themeBtn);

    // Pro badge
    if (!isProActive()) {
      var proBtn = document.createElement('button');
      proBtn.className = 'cj-tb-btn cj-tb-pro';
      proBtn.textContent = 'Pro';
      proBtn.title = 'Upgrade to Pro';
      proBtn.addEventListener('click', function () {
        if (chrome && chrome.tabs) {
          chrome.tabs.create({ url: chrome.runtime.getURL('src/viewer/viewer.html#upgrade') });
        }
      });
      right.appendChild(proBtn);
    }

    tb.appendChild(right);

    // Bind search
    searchInput.addEventListener('input', function () {
      doSearch(this.value, regexBtn.classList.contains('cj-active'));
    });

    // Ctrl+F focuses search
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });

    return tb;
  }

  function createBtn(title, className, handler) {
    var btn = document.createElement('button');
    btn.className = 'cj-tb-btn cj-tb-' + className;
    btn.title = title;
    btn.textContent = title;
    btn.addEventListener('click', handler);
    return btn;
  }

  // ================================================================
  //  SEARCH
  // ================================================================

  function doSearch(query, useRegex) {
    state.searchResults = [];
    state.searchIndex = -1;

    // Clear previous highlights
    clearHighlights();

    var countEl = document.getElementById('cj-search-count');
    if (!query || query.length < 2) {
      if (countEl) countEl.textContent = '';
      return;
    }

    var pattern;
    try {
      pattern = useRegex ? new RegExp(query, 'gi') : new RegExp(escapeRegex(query), 'gi');
    } catch (e) {
      if (countEl) countEl.textContent = 'invalid';
      return;
    }

    // Find all matching nodes in the tree
    var nodes = document.querySelectorAll('.cj-value, .cj-key');
    var results = [];

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var text = node.textContent || '';
      if (pattern.test(text)) {
        // Reset lastIndex since we're reusing the regex
        pattern.lastIndex = 0;
        results.push(node);
        node.classList.add('cj-search-match');
      }
      pattern.lastIndex = 0;
    }

    state.searchResults = results;

    if (countEl) {
      countEl.textContent = results.length > 0 ? results.length + ' match' + (results.length !== 1 ? 'es' : '') : 'No matches';
    }

    // Scroll to first result
    if (results.length > 0) {
      state.searchIndex = 0;
      highlightCurrentResult();
    }
  }

  function navigateSearch(direction) {
    if (state.searchResults.length === 0) return;

    state.searchIndex += direction;
    if (state.searchIndex >= state.searchResults.length) state.searchIndex = 0;
    if (state.searchIndex < 0) state.searchIndex = state.searchResults.length - 1;

    highlightCurrentResult();
  }

  function highlightCurrentResult() {
    // Remove current marker from all
    var currents = document.querySelectorAll('.cj-search-current');
    for (var i = 0; i < currents.length; i++) {
      currents[i].classList.remove('cj-search-current');
    }

    if (state.searchIndex >= 0 && state.searchIndex < state.searchResults.length) {
      var el = state.searchResults[state.searchIndex];
      el.classList.add('cj-search-current');

      // Ensure the node is visible — expand parent collapsible sections
      expandAncestors(el);

      // Scroll into view
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function clearHighlights() {
    var matches = document.querySelectorAll('.cj-search-match, .cj-search-current');
    for (var i = 0; i < matches.length; i++) {
      matches[i].classList.remove('cj-search-match', 'cj-search-current');
    }
  }

  function expandAncestors(el) {
    var parent = el.closest('.cj-body');
    while (parent) {
      if (parent.classList.contains('cj-collapsed')) {
        parent.classList.remove('cj-collapsed');
        // Also update the toggle
        var head = parent.parentElement.querySelector('.cj-toggle');
        if (head && !head.classList.contains('cj-empty')) {
          head.classList.remove('cj-collapsed');
          head.textContent = '▼';
        }
      }
      parent = parent.parentElement.closest('.cj-body');
    }
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ================================================================
  //  STATS BAR
  // ================================================================

  function buildStatsBar(stats, rawText) {
    var bar = document.createElement('div');
    bar.id = 'cj-stats-bar';
    bar.className = 'cj-stats-bar';

    var sizeStr = formatBytes(stats.sizeBytes || new Blob([rawText]).size);

    var items = [
      { label: 'Nodes', value: formatNumber(stats.nodes) },
      { label: 'Depth', value: String(stats.maxDepth) },
      { label: 'Size', value: sizeStr },
      { label: 'Parse', value: stats.parseTimeMs + ' ms' }
    ];

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var el = document.createElement('span');
      el.className = 'cj-stat-item';
      el.innerHTML = '<span class="cj-stat-label">' + item.label + '</span> ' +
                     '<span class="cj-stat-value">' + item.value + '</span>';
      bar.appendChild(el);
      if (i < items.length - 1) {
        var sep = document.createElement('span');
        sep.className = 'cj-stat-sep';
        bar.appendChild(sep);
      }
    }
    return bar;
  }

  // ================================================================
  //  TOOLBAR ACTIONS
  // ================================================================

  function toggleRawView() {
    var container = document.getElementById('cj-tree-container');
    if (!container) return;

    if (!state.rawMode) {
      if (!state.rawTextCache) state.rawTextCache = getJSONText();
      container.innerHTML = '';
      var pre = document.createElement('pre');
      pre.id = 'cj-raw-view';
      pre.className = 'cj-raw-view';
      var formatted = JSON.stringify(state.parsedData, null, 2);
      pre.innerHTML = C.Tokenizer.toHTML(formatted, state.settings.showLineNumbers);
      container.appendChild(pre);
      document.querySelector('.cj-tb-raw').textContent = 'Tree';
      state.rawMode = true;
    } else {
      container.innerHTML = '';
      container.appendChild(state.treeRoot);
      document.querySelector('.cj-tb-raw').textContent = 'Raw';
      state.rawMode = false;
    }
  }

  function copyFullJSON() {
    var text = JSON.stringify(state.parsedData, null, 2);
    navigator.clipboard.writeText(text).then(function () {
      showToast('Copied!');
    }).catch(function () {
      showToast('Copy failed');
    });
  }

  function cycleTheme() {
    var isPro = C.License && C.License.isActive();
    var themes = isPro ? C.Themes.FREE_THEMES.concat(C.Themes.PRO_THEMES) : C.Themes.FREE_THEMES;
    var current = state.settings.theme;
    var idx = themes.indexOf(current);
    if (idx === -1) idx = 0;
    var next = themes[(idx + 1) % themes.length];

    state.settings.theme = next;
    saveSetting('theme', next);

    var app = document.getElementById('clearjson-app');
    if (app) app.className = 'cj-theme-' + next;

    var themeBtn = document.querySelector('.cj-tb-theme');
    if (themeBtn) {
      themeBtn.textContent = C.Themes.getThemeLabel(next);
      // Show Pro badge if on a Pro theme
      var isProTheme = isPro && C.Themes.PRO_THEMES.indexOf(next) !== -1;
      themeBtn.style.color = isProTheme ? 'var(--cj-accent, #cba6f7)' : '';
    }

    showToast('Theme: ' + C.Themes.getThemeLabel(next));
  }

  // ================================================================
  //  KEYBOARD SHORTCUTS
  // ================================================================

  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey) return; // allow Ctrl+F, etc. to pass through

      var shortcut = buildShortcutString(e);
      if (!shortcut) return;

      var shortcuts = getActiveShortcuts();

      // Check each defined shortcut
      if (shortcut === shortcuts.collapseAll) { e.preventDefault(); C.Tree.collapseAll(state.treeRoot); return; }
      if (shortcut === shortcuts.expandAll)   { e.preventDefault(); C.Tree.expandAll(state.treeRoot); return; }
      if (shortcut === shortcuts.cycleTheme)  { e.preventDefault(); cycleTheme(); return; }
      if (shortcut === shortcuts.toggleRaw)   { e.preventDefault(); toggleRawView(); return; }
      if (shortcut === shortcuts.searchNext)  {
        if (state.searchResults.length > 0) { e.preventDefault(); navigateSearch(1); }
        return;
      }
      if (shortcut === shortcuts.searchPrev)  {
        if (state.searchResults.length > 0) { e.preventDefault(); navigateSearch(-1); }
        return;
      }
    });
  }

  var SHORTCUT_DEFAULTS = {
    collapseAll: '[',
    expandAll: ']',
    cycleTheme: 'd',
    toggleRaw: 'r',
    searchNext: 'Enter',
    searchPrev: 'Shift+Enter'
  };

  function getActiveShortcuts() {
    var custom = (state.settings && state.settings.shortcuts) || {};
    var merged = {};
    Object.keys(SHORTCUT_DEFAULTS).forEach(function (key) {
      merged[key] = custom[key] || SHORTCUT_DEFAULTS[key];
    });
    return merged;
  }

  function buildShortcutString(e) {
    if (['Control', 'Shift', 'Alt', 'Meta'].indexOf(e.key) !== -1) return null;
    var parts = [];
    if (e.shiftKey && e.key !== 'Enter') parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    var key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (e.shiftKey && e.key === 'Enter') parts.push('Shift');
    parts.push(key);
    return parts.join('+');
  }

  // ================================================================
  //  THEME INJECTION
  // ================================================================

  function injectThemeVars() {
    var style = document.createElement('style');
    style.id = 'cj-theme-vars';
    style.textContent = C.Themes.getThemeCSS(state.settings.theme);
    document.head.appendChild(style);
  }

  // ================================================================
  //  IMAGE PREVIEW POPUP (enhanced for Phase 2)
  // ================================================================

  function initImagePreview() {
    // Delegate hover events for image URLs
    document.addEventListener('mouseover', function (e) {
      var imgEl = e.target.closest('.cj-image');
      if (!imgEl) return;
      showImagePopup(imgEl, e);
    });

    document.addEventListener('mouseout', function (e) {
      var imgEl = e.target.closest('.cj-image');
      if (!imgEl) return;
      hideImagePopup();
    });
  }

  function showImagePopup(el, event) {
    hideImagePopup();
    var src = el.getAttribute('data-img-src') || '';
    if (!src) {
      // Extract from text content
      var text = el.textContent || '';
      var match = text.match(/"(https?:\/\/[^"]+\.(png|jpg|jpeg|gif|svg|webp)[^"]*)"/i);
      if (match) src = match[1];
    }
    if (!src) return;

    var popup = document.createElement('div');
    popup.id = 'cj-img-popup';
    popup.className = 'cj-img-popup';

    var img = document.createElement('img');
    img.src = src;
    img.onerror = function () { hideImagePopup(); };

    popup.appendChild(img);
    document.body.appendChild(popup);

    // Position near mouse
    positionPopup(popup, event);
  }

  function hideImagePopup() {
    var popup = document.getElementById('cj-img-popup');
    if (popup) popup.remove();
  }

  function positionPopup(popup, event) {
    var x = event.clientX + 12;
    var y = event.clientY - 10;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    // Keep in viewport
    if (x + 220 > vw) x = event.clientX - 222;
    if (y + 170 > vh) y = vh - 180;
    if (x < 4) x = 4;
    if (y < 4) y = 4;

    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
  }

  // ================================================================
  //  ERROR DISPLAY
  // ================================================================

  function showError(result) {
    var theme = (C.Themes.THEMES[state.settings.theme] || C.Themes.THEMES['dark']);
    var themeBg = theme.bg || '#1e1e2e';

    document.head.innerHTML = '';
    document.body.innerHTML = '';

    document.body.style.backgroundColor = themeBg;
    injectThemeVars();

    var wrapper = document.createElement('div');
    wrapper.id = 'clearjson-app';
    wrapper.className = 'cj-theme-' + (state.settings.theme || 'dark');

    var errorBox = document.createElement('div');
    errorBox.className = 'cj-error';
    errorBox.innerHTML =
      '<div class="cj-error-icon">⚠</div>' +
      '<h2>Invalid JSON</h2>' +
      '<p>' + escapeHTML(result.error) + '</p>' +
      '<p class="cj-error-location">Line ' + result.line + ', Column ' + result.column + '</p>';

    wrapper.appendChild(errorBox);
    document.body.appendChild(wrapper);
  }

  // ================================================================
  //  SETTINGS
  // ================================================================

  function loadSettings(callback) {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('clearjson', function (data) {
        var saved = data && data.clearjson ? data.clearjson : {};
        var settings = {};
        var keys = Object.keys(DEFAULT_SETTINGS);
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          settings[k] = (saved[k] !== undefined) ? saved[k] : DEFAULT_SETTINGS[k];
        }
        callback(settings);
      });
    } else {
      callback(Object.assign({}, DEFAULT_SETTINGS));
    }
  }

  function saveSetting(key, value) {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('clearjson', function (data) {
        var settings = data && data.clearjson ? data.clearjson : {};
        settings[key] = value;
        chrome.storage.local.set({ clearjson: settings });
      });
    }
  }

  // ================================================================
  //  UTILITY
  // ================================================================

  function showToast(msg) {
    var existing = document.querySelector('.cj-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'cj-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('cj-toast-out');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 1500);
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + ' ' + sizes[i];
  }

  function formatNumber(n) {
    return n < 1000 ? String(n) : n.toLocaleString('en-US');
  }

  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ================================================================
  //  STARTUP
  // ================================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose state for Pro features
  C._state = state;
})(ClearJSON);
