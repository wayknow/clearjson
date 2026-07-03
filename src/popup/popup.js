/**
 * ClearJSON Popup — mini dashboard in the extension toolbar.
 */

(function () {
  'use strict';

  // Check current tab status
  updatePageStatus();

  // Viewer button
  // Dev mode toggle
  var devToggle = document.getElementById('dev-toggle');
  if (devToggle) {
    devToggle.checked = localStorage.getItem('clearjson_pro_dev') === '1';
    devToggle.addEventListener('change', function () {
      if (this.checked) {
        localStorage.setItem('clearjson_pro_dev', '1');
      } else {
        localStorage.removeItem('clearjson_pro_dev');
      }
    });
  }

  document.getElementById('btn-viewer').addEventListener('click', function () {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/viewer/viewer.html?dev') });
  });

  function updatePageStatus() {
    var statusEl = document.getElementById('page-status');
    if (!statusEl) return;

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs || tabs.length === 0) {
        statusEl.textContent = 'Unknown';
        statusEl.style.color = '#f38ba8';
        return;
      }

      var tab = tabs[0];
      var url = tab.url || '';

      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        statusEl.textContent = 'System page — no access';
        statusEl.style.color = '#9399b2';
      } else if (url.endsWith('.json') || url.includes('application/json')) {
        statusEl.textContent = 'JSON detected — using ClearJSON';
        statusEl.style.color = '#a6e3a1';
      } else {
        statusEl.textContent = 'Not a JSON page';
        statusEl.style.color = '#9399b2';
      }
    });
  }
})();
