/**
 * ClearJSON Stream Parser — Pro Feature
 *
 * Handles large JSON files (up to 500 MB) without freezing the browser.
 *
 * Architecture:
 *   1. Raw JSON text is sent to a Web Worker for parsing
 *   2. Worker builds a flat array of { type, path, depth, key, value, hasChildren } nodes
 *   3. Main thread renders only visible nodes (~50-100) using virtual scrolling
 *   4. Collapse/expand filters which nodes are in the visible set
 *
 * This avoids:
 *   - Main thread freeze from JSON.parse() on large files
 *   - DOM node explosion from rendering all nodes
 *   - Memory pressure from holding both raw text + DOM tree
 */

var ClearJSON = window.ClearJSON || {};

(function (C) {
  'use strict';

  var WORKER_SCRIPT = [
    'self.onmessage = function(e) {',
    '  var text = e.data;',
    '  try {',
    '    var nodes = [];',
    '    var data = JSON.parse(text);',
    '    flatten(data, "$", 0, "", nodes);',
    '    self.postMessage({ ok: true, nodes: nodes });',
    '  } catch(err) {',
    '    self.postMessage({ ok: false, error: err.message });',
    '  }',
    '};',

    'function flatten(value, path, depth, key, nodes) {',
    '  if (Array.isArray(value)) {',
    '    nodes.push({ type: "array", path: path, depth: depth, key: key, value: null,',
    '      hasChildren: value.length > 0, count: value.length });',
    '    for (var i = 0; i < value.length; i++) {',
    '      flatten(value[i], path + "[" + i + "]", depth + 1, String(i), nodes);',
    '    }',
    '    nodes.push({ type: "array-end", path: path + "_end", depth: depth, key: "", value: null,',
    '      hasChildren: false, count: 0 });',
    '  } else if (value !== null && typeof value === "object") {',
    '    var keys = Object.keys(value);',
    '    nodes.push({ type: "object", path: path, depth: depth, key: key, value: null,',
    '      hasChildren: keys.length > 0, count: keys.length });',
    '    for (var j = 0; j < keys.length; j++) {',
    '      var k = keys[j];',
    '      var childPath = path + (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? "." + k : "[\'" + k + "\']");',
    '      flatten(value[k], childPath, depth + 1, k, nodes);',
    '    }',
    '    nodes.push({ type: "object-end", path: path + "_end", depth: depth, key: "", value: null,',
    '      hasChildren: false, count: 0 });',
    '  } else {',
    '    nodes.push({ type: "primitive", path: path, depth: depth, key: key,',
    '      value: formatPrimitive(value), hasChildren: false, count: 0,',
    '      rawValue: value });',
    '  }',
    '};',

    'function formatPrimitive(v) {',
    '  if (v === null) return "null";',
    '  if (typeof v === "boolean") return String(v);',
    '  if (typeof v === "number") return String(v);',
    '  if (typeof v === "string") return JSON.stringify(v);',
    '  return String(v);',
    '};'
  ].join('\n');

  /**
   * Parse large JSON text in a Web Worker.
   *
   * @param {string} text — Raw JSON text
   * @param {function} onProgress — Called with { percent: number } during processing
   * @returns {Promise<{ok: boolean, nodes?: Array, error?: string}>}
   */
  function parseLarge(text, onProgress) {
    return new Promise(function (resolve, reject) {
      try {
        var blob = new Blob([WORKER_SCRIPT], { type: 'text/javascript' });
        var workerUrl = URL.createObjectURL(blob);
        var worker = new Worker(workerUrl);

        var timeout = setTimeout(function () {
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          reject(new Error('Parsing timed out (file too large)'));
        }, 60000); // 60 second timeout

        worker.onmessage = function (e) {
          clearTimeout(timeout);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);

          if (e.data.ok) {
            resolve({
              ok: true,
              nodes: e.data.nodes,
              totalNodes: e.data.nodes.length
            });
          } else {
            resolve({
              ok: false,
              error: e.data.error
            });
          }
        };

        worker.onerror = function (err) {
          clearTimeout(timeout);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          resolve({ ok: false, error: err.message || 'Worker error' });
        };

        worker.postMessage(text);

        // Simulate progress
        if (onProgress) {
          var start = Date.now();
          var progressInterval = setInterval(function () {
            var elapsed = Date.now() - start;
            // Rough estimate — most files parse in < 5s, very large in < 30s
            var pct = Math.min(95, Math.round(elapsed / 300));
            onProgress({ percent: pct });
          }, 150);

          // Clean up interval on completion
          var origResolve = resolve;
          resolve = function (result) {
            clearInterval(progressInterval);
            if (onProgress) onProgress({ percent: 100 });
            origResolve(result);
          };
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Build a view model from flat nodes for virtual rendering.
   * Handles collapse/expand state.
   */
  function buildViewModel(nodes, collapsedPaths) {
    collapsedPaths = collapsedPaths || {};
    var viewModel = [];
    var skipUntilDepth = -1;

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];

      // If we're skipping children of a collapsed node
      if (skipUntilDepth >= 0) {
        if (node.depth > skipUntilDepth) continue;
        skipUntilDepth = -1;
      }

      viewModel.push(node);

      // If this node is collapsed, skip its children
      if (node.hasChildren && collapsedPaths[node.path]) {
        skipUntilDepth = node.depth;
      }
    }

    return viewModel;
  }

  C.StreamParser = {
    parseLarge: parseLarge,
    buildViewModel: buildViewModel,
    WORKER_SCRIPT: WORKER_SCRIPT
  };
})(ClearJSON);
