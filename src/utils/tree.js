/**
 * ClearJSON Tree — interactive collapsible tree view renderer.
 *
 * Builds a DOM tree from parsed JSON data with:
 *   - Collapsible object/array nodes
 *   - Indent guides (dotted vertical lines)
 *   - Element counts
 *   - Click-to-copy values
 *   - Right-click to copy JSONPath
 *   - Line numbers
 *
 * All DOM creation uses vanilla JS — no framework.
 */

var ClearJSON = window.ClearJSON || {};

(function (C) {
  'use strict';

  // Current indentation level for indent guides
  var INDENT = 20; // px per level

  /**
   * Render parsed JSON data into a tree view DOM element.
   *
   * @param {*} data — Parsed JSON value
   * @param {object} options
   * @param {number} [options.initialDepth=2] — Expand to this depth on first render
   * @param {number} [options.indent=20] — Indent size in px
   * @returns {{ element: HTMLElement, pathMap: Map<HTMLElement, string> }}
   */
  function render(data, options) {
    options = options || {};
    var initialDepth = options.initialDepth || 2;
    INDENT = options.indent || 20;

    var pathMap = new Map(); // DOM node → JSONPath

    var rootEl = document.createElement('div');
    rootEl.className = 'cj-tree';

    // Count total lines for line numbers
    var totalLines = countLines(data);

    renderNode(data, rootEl, '$', 0, initialDepth, pathMap, totalLines);

    return {
      element: rootEl,
      pathMap: pathMap
    };
  }

  /**
   * Count total visible lines (for line number gutter width).
   */
  function countLines(data) {
    var count = 0;

    function walk(val) {
      if (Array.isArray(val)) {
        count++; // opening bracket
        for (var i = 0; i < val.length; i++) {
          walk(val[i]);
        }
        count++; // closing bracket
      } else if (val !== null && typeof val === 'object') {
        count++; // opening brace
        var keys = Object.keys(val);
        for (var i = 0; i < keys.length; i++) {
          walk(val[keys[i]]);
        }
        count++; // closing brace
      } else {
        count++; // primitive value line
      }
    }

    walk(data);
    return count;
  }

  /**
   * Recursively render a JSON node.
   */
  function renderNode(value, parentEl, path, depth, initialDepth, pathMap, totalLines) {
    var nodeEl = document.createElement('div');
    nodeEl.className = 'cj-node';
    nodeEl.style.paddingLeft = (depth * INDENT) + 'px';
    nodeEl.setAttribute('data-path', path);

    // Indent guides
    for (var d = 1; d < depth; d++) {
      var guide = document.createElement('span');
      guide.className = 'cj-guide';
      guide.style.left = (d * INDENT - INDENT / 2) + 'px';
      nodeEl.appendChild(guide);
    }

    if (Array.isArray(value)) {
      renderArray(value, nodeEl, path, depth, initialDepth, pathMap, totalLines);
    } else if (value !== null && typeof value === 'object') {
      renderObject(value, nodeEl, path, depth, initialDepth, pathMap, totalLines);
    } else {
      renderPrimitive(value, nodeEl, path, pathMap);
    }

    parentEl.appendChild(nodeEl);
  }

  /**
   * Render an array node.
   */
  function renderArray(arr, nodeEl, path, depth, initialDepth, pathMap, totalLines) {
    var len = arr.length;
    var isEmpty = len === 0;
    var collapsed = depth >= initialDepth && !isEmpty;

    // Toggle button
    var toggle = createToggle(collapsed, isEmpty);

    // Bracket + count
    var bracket = document.createElement('span');
    bracket.className = 'cj-punct';
    bracket.textContent = '[';

    var count = document.createElement('span');
    count.className = 'cj-count';
    count.textContent = isEmpty ? 'empty' : len + ' item' + (len !== 1 ? 's' : '');

    var head = document.createElement('span');
    head.className = 'cj-head';
    head.appendChild(toggle);
    head.appendChild(bracket);
    head.appendChild(count);

    nodeEl.appendChild(head);

    if (!isEmpty) {
      var body = document.createElement('div');
      body.className = 'cj-body' + (collapsed ? ' cj-collapsed' : '');

      for (var i = 0; i < len; i++) {
        renderNode(arr[i], body, path + '[' + i + ']', depth + 1, initialDepth, pathMap, totalLines);
      }

      nodeEl.appendChild(body);

      var closeBracket = document.createElement('div');
      closeBracket.className = 'cj-node cj-close';
      closeBracket.style.paddingLeft = (depth * INDENT) + 'px';
      closeBracket.innerHTML = '<span class="cj-punct">]</span>';
      nodeEl.appendChild(closeBracket);

      // Toggle click handler
      if (toggle) {
        toggle.addEventListener('click', function (e) {
          e.stopPropagation();
          var isCollapsed = body.classList.toggle('cj-collapsed');
          toggle.classList.toggle('cj-collapsed', isCollapsed);
          toggle.textContent = isCollapsed ? '▶' : '▼';
        });
      }
    }
  }

  /**
   * Render an object node.
   */
  function renderObject(obj, nodeEl, path, depth, initialDepth, pathMap, totalLines) {
    var keys = Object.keys(obj);
    var isEmpty = keys.length === 0;
    var collapsed = depth >= initialDepth && !isEmpty;

    var toggle = createToggle(collapsed, isEmpty);

    var bracket = document.createElement('span');
    bracket.className = 'cj-punct';
    bracket.textContent = '{';

    var count = document.createElement('span');
    count.className = 'cj-count';
    count.textContent = isEmpty ? 'empty' : keys.length + ' key' + (keys.length !== 1 ? 's' : '');

    var head = document.createElement('span');
    head.className = 'cj-head';
    head.appendChild(toggle);
    head.appendChild(bracket);
    head.appendChild(count);

    nodeEl.appendChild(head);

    if (!isEmpty) {
      var body = document.createElement('div');
      body.className = 'cj-body' + (collapsed ? ' cj-collapsed' : '');

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var childPath = path + '.' + (needsBracketNotation(key) ? '["' + key + '"]' : key);
        var childNode = document.createElement('div');
        childNode.className = 'cj-node';
        childNode.style.paddingLeft = ((depth + 1) * INDENT) + 'px';
        childNode.setAttribute('data-path', childPath);

        // Indent guides
        for (var d = 1; d <= depth; d++) {
          var guide = document.createElement('span');
          guide.className = 'cj-guide';
          guide.style.left = (d * INDENT - INDENT / 2) + 'px';
          childNode.appendChild(guide);
        }

        // Key
        var keySpan = document.createElement('span');
        keySpan.className = 'cj-key';
        keySpan.textContent = '"' + key + '"';

        var colon = document.createElement('span');
        colon.className = 'cj-punct';
        colon.textContent = ': ';

        childNode.appendChild(keySpan);
        childNode.appendChild(colon);

        var val = obj[key];
        if (Array.isArray(val)) {
          renderArray(val, childNode, childPath, depth + 1, initialDepth, pathMap, totalLines);
        } else if (val !== null && typeof val === 'object') {
          renderObject(val, childNode, childPath, depth + 1, initialDepth, pathMap, totalLines);
        } else {
          renderPrimitiveInline(val, childNode, childPath, pathMap);
        }

        body.appendChild(childNode);
      }

      nodeEl.appendChild(body);

      var closeBrace = document.createElement('div');
      closeBrace.className = 'cj-node cj-close';
      closeBrace.style.paddingLeft = (depth * INDENT) + 'px';
      closeBrace.innerHTML = '<span class="cj-punct">}</span>';
      nodeEl.appendChild(closeBrace);

      // Toggle click handler
      if (toggle) {
        toggle.addEventListener('click', function (e) {
          e.stopPropagation();
          var isCollapsed = body.classList.toggle('cj-collapsed');
          toggle.classList.toggle('cj-collapsed', isCollapsed);
          toggle.textContent = isCollapsed ? '▶' : '▼';
        });
      }
    }
  }

  /**
   * Render a primitive value on its own line (used in arrays).
   */
  function renderPrimitive(value, nodeEl, path, pathMap) {
    var span = document.createElement('span');
    span.className = 'cj-value';
    span.setAttribute('data-path', path);
    renderPrimitiveHTML(value, span, path, pathMap);
    nodeEl.appendChild(span);
  }

  /**
   * Render a primitive value inline (used in object values after key:).
   */
  function renderPrimitiveInline(value, parentEl, path, pathMap) {
    var span = document.createElement('span');
    span.className = 'cj-value';
    span.setAttribute('data-path', path);
    renderPrimitiveHTML(value, span, path, pathMap);
    parentEl.appendChild(span);
  }

  /**
   * Build the HTML for a primitive value.
   */
  function renderPrimitiveHTML(value, span, path, pathMap) {
    if (value === null) {
      span.className += ' cj-null';
      span.textContent = 'null';
    } else if (typeof value === 'boolean') {
      span.className += ' cj-boolean';
      span.textContent = String(value);
    } else if (typeof value === 'number') {
      span.className += ' cj-number';
      span.textContent = formatNumber(value);
    } else if (typeof value === 'string') {
      // Check for URL or image
      if (C.Tokenizer.isImageURL(value)) {
        span.className += ' cj-image';
        span.setAttribute('data-img-src', value);
        span.innerHTML = '<span class="cj-string">"</span>' +
          escapeHTML(value) +
          '<span class="cj-string">"</span>';
      } else if (C.Tokenizer.isURL(value)) {
        span.className += ' cj-link';
        span.innerHTML = '<span class="cj-string">"</span>' +
          '<a href="' + escapeHTML(value) + '" target="_blank" rel="noopener">' + escapeHTML(value) + '</a>' +
          '<span class="cj-string">"</span>';
      } else {
        span.className += ' cj-string';
        span.textContent = '"' + value + '"';
      }
    }

    // Click to copy primitive value
    span.addEventListener('click', function (e) {
      e.stopPropagation();
      copyToClipboard(value);
      showCopyToast(span, path);
    });

    // Right-click to copy JSONPath
    span.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      e.stopPropagation();
      copyToClipboard(path);
      showCopyToast(span, 'Copied: ' + path);
    });

    // Register path
    pathMap.set(span, path);
  }

  /**
   * Create a toggle button (▼ / ▶).
   */
  function createToggle(collapsed, isEmpty) {
    if (isEmpty) {
      var empty = document.createElement('span');
      empty.className = 'cj-toggle cj-empty';
      return empty;
    }
    var btn = document.createElement('span');
    btn.className = 'cj-toggle' + (collapsed ? ' cj-collapsed' : '');
    btn.textContent = collapsed ? '▶' : '▼';
    return btn;
  }

  /**
   * Format a number for display. Show big ints as-is, trim excessive decimals.
   */
  function formatNumber(n) {
    if (typeof n !== 'number') return String(n);
    // If it's an integer that fits in safe range, show as-is
    if (Number.isInteger(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER) {
      return String(n);
    }
    // For floats, limit decimal places
    return String(n);
  }

  /**
   * Check if a key needs bracket notation for JSONPath.
   */
  function needsBracketNotation(key) {
    return !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
  }

  /**
   * Copy a value to clipboard.
   */
  function copyToClipboard(value) {
    var text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    navigator.clipboard.writeText(text).catch(function () {
      // Fallback for older browsers
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }

  /**
   * Show a brief toast notification near the element.
   */
  function showCopyToast(nearEl, message) {
    // Remove existing toasts
    var existing = document.querySelector('.cj-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'cj-toast';
    toast.textContent = typeof message === 'string' ? message : 'Copied!';
    document.body.appendChild(toast);

    // Position near the click
    // Use a fixed position near the bottom
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';

    setTimeout(function () {
      toast.classList.add('cj-toast-out');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 1200);
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Expand all nodes in the tree.
   */
  function expandAll(rootEl) {
    var bodies = rootEl.querySelectorAll('.cj-body.cj-collapsed');
    for (var i = 0; i < bodies.length; i++) {
      bodies[i].classList.remove('cj-collapsed');
    }
    var toggles = rootEl.querySelectorAll('.cj-toggle.cj-collapsed');
    for (var j = 0; j < toggles.length; j++) {
      toggles[j].classList.remove('cj-collapsed');
      toggles[j].textContent = '▼';
    }
  }

  /**
   * Collapse all nodes in the tree.
   */
  function collapseAll(rootEl) {
    var bodies = rootEl.querySelectorAll('.cj-body:not(.cj-collapsed)');
    for (var i = 0; i < bodies.length; i++) {
      bodies[i].classList.add('cj-collapsed');
    }
    var toggles = rootEl.querySelectorAll('.cj-toggle:not(.cj-collapsed):not(.cj-empty)');
    for (var j = 0; j < toggles.length; j++) {
      toggles[j].classList.add('cj-collapsed');
      toggles[j].textContent = '▶';
    }
  }

  C.Tree = {
    render: render,
    expandAll: expandAll,
    collapseAll: collapseAll
  };
})(ClearJSON);
