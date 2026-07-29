/**
 * ClearJSON Popup — mini dashboard in the extension toolbar.
 */

(function () {
  'use strict';

  // Check current tab status
  updatePageStatus();

  // Viewer button
  // Dev mode toggle — hidden in free release (restore for Pro development)
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
    chrome.tabs.create({ url: chrome.runtime.getURL('src/viewer/viewer.html') });
  });

  function updatePageStatus() {
    var statusEl = document.getElementById('page-status');
    if (!statusEl) return;

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs || tabs.length === 0) {
        statusEl.textContent = 'Unknown';
        statusEl.className = 'popup-status cj-status-error';
        return;
      }

      var tab = tabs[0];
      var url = tab.url || '';

      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
        statusEl.textContent = 'System page — no access';
        statusEl.className = 'popup-status';
      } else if (url.endsWith('.json') || url.includes('application/json')) {
        statusEl.textContent = 'JSON detected — using ClearJSON';
        statusEl.className = 'popup-status cj-status-success';
      } else {
        statusEl.textContent = 'Not a JSON page';
        statusEl.className = 'popup-status';
      }
    });
  }
})();
