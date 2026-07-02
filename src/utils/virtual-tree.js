/**
 * ClearJSON Virtual Tree — Pro Feature
 *
 * Renders a flat node array with virtual scrolling.
 * Only creates DOM nodes for items visible in the viewport (~50-100 out of millions).
 *
 * Usage:
 *   var vt = ClearJSON.VirtualTree.create(container, nodes, options);
 *   vt.render();
 */

var ClearJSON = window.ClearJSON || {};

(function (C) {
  'use strict';

  var ROW_HEIGHT = 22; // px per row
  var BUFFER_ROWS = 20; // extra rows above/below viewport
  var INDENT_PX = 18;   // px per depth level

  /**
   * Create a virtual tree instance.
   *
   * @param {HTMLElement} container — Scrollable container element
   * @param {Array} nodes — Flat node array from StreamParser
   * @param {object} options
   * @returns {{ render: Function, expandAll: Function, collapseAll: Function, toggleNode: Function, destroy: Function }}
   */
  function create(container, nodes, options) {
    options = options || {};

    var collapsedPaths = options.collapsedPaths || {};
    var onNodeClick = options.onNodeClick || null;
    var onNodeContextMenu = options.onNodeContextMenu || null;

    var viewModel = [];     // filtered visible nodes
    var innerEl = null;     // inner container (tall, with spacer divs)
    var isDestroyed = false;

    // Build initial view model
    rebuildViewModel();

    /**
     * Rebuild the flat view model based on collapse state.
     */
    function rebuildViewModel() {
      viewModel.length = 0;
      var skipUntil = -1;

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (skipUntil >= 0) {
          if (node.depth > skipUntil) continue;
          skipUntil = -1;
        }
        viewModel.push(node);
        if (node.hasChildren && collapsedPaths[node.path]) {
          skipUntil = node.depth;
        }
      }
    }

    /**
     * Render the tree. Only creates DOM for visible rows.
     */
    function render() {
      if (isDestroyed) return;

      // Clear container
      container.innerHTML = '';

      // Create inner element with full height
      innerEl = document.createElement('div');
      innerEl.className = 'cj-vtree-inner';
      innerEl.style.height = (viewModel.length * ROW_HEIGHT) + 'px';
      innerEl.style.position = 'relative';
      container.appendChild(innerEl);

      // Render visible rows
      renderVisibleRows();

      // Scroll handler
      container.addEventListener('scroll', onScroll, { passive: true });
    }

    function onScroll() {
      if (isDestroyed) return;
      renderVisibleRows();
    }

    function renderVisibleRows() {
      if (!innerEl) return;

      var scrollTop = container.scrollTop;
      var containerHeight = container.clientHeight;

      var firstVisible = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
      var lastVisible = Math.min(viewModel.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_ROWS);

      // Remove existing row elements
      while (innerEl.firstChild) {
        innerEl.removeChild(innerEl.firstChild);
      }

      // Top spacer
      if (firstVisible > 0) {
        var topSpacer = document.createElement('div');
        topSpacer.style.height = (firstVisible * ROW_HEIGHT) + 'px';
        innerEl.appendChild(topSpacer);
      }

      // Render visible rows
      for (var i = firstVisible; i < lastVisible; i++) {
        var node = viewModel[i];
        var row = createRow(node, i);
        innerEl.appendChild(row);
      }
    }

    function createRow(node, index) {
      var row = document.createElement('div');
      row.className = 'cj-vrow';
      row.style.height = ROW_HEIGHT + 'px';
      row.style.lineHeight = ROW_HEIGHT + 'px';
      row.style.paddingLeft = (node.depth * INDENT_PX + 12) + 'px';
      row.setAttribute('data-path', node.path);
      row.setAttribute('data-index', String(index));

      if (node.type === 'array') {
        row.innerHTML = buildArrayLine(node);
      } else if (node.type === 'object') {
        row.innerHTML = buildObjectLine(node);
      } else if (node.type === 'array-end') {
        row.innerHTML = '<span class="cj-punct">]</span>';
      } else if (node.type === 'object-end') {
        row.innerHTML = '<span class="cj-punct">}</span>';
      } else {
        // primitive
        row.innerHTML = buildPrimitiveLine(node);
      }

      // Click to toggle collapse/expand
      if (node.hasChildren) {
        row.addEventListener('click', function (e) {
          e.stopPropagation();
          toggleNode(node.path);
        });
      }

      // Click primitive to copy
      if (node.type === 'primitive') {
        row.addEventListener('click', function (e) {
          e.stopPropagation();
          if (node.rawValue !== undefined) {
            copyValue(node.rawValue);
            showMiniToast('Copied');
          }
        });

        row.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          copyValue(node.path);
          showMiniToast('Copied: ' + node.path);
        });
      }

      return row;
    }

    function buildArrayLine(node) {
      var toggle = node.hasChildren
        ? '<span class="cj-toggle" data-path="' + node.path + '">' +
          (collapsedPaths[node.path] ? '▶' : '▼') + '</span>'
        : '<span class="cj-toggle cj-empty"></span>';

      var keyPart = node.key ? '<span class="cj-key">"' + escapeHTML(node.key) + '"</span><span class="cj-punct">: </span>' : '';

      return toggle + keyPart +
        '<span class="cj-punct">[</span>' +
        '<span class="cj-count">' + node.count + ' item' + (node.count !== 1 ? 's' : '') + '</span>';
    }

    function buildObjectLine(node) {
      var toggle = node.hasChildren
        ? '<span class="cj-toggle" data-path="' + node.path + '">' +
          (collapsedPaths[node.path] ? '▶' : '▼') + '</span>'
        : '<span class="cj-toggle cj-empty"></span>';

      var keyPart = node.key ? '<span class="cj-key">"' + escapeHTML(node.key) + '"</span><span class="cj-punct">: </span>' : '';

      return toggle + keyPart +
        '<span class="cj-punct">{</span>' +
        '<span class="cj-count">' + node.count + ' key' + (node.count !== 1 ? 's' : '') + '</span>';
    }

    function buildPrimitiveLine(node) {
      var keyPart = node.key ? '<span class="cj-key">"' + escapeHTML(node.key) + '"</span><span class="cj-punct">: </span>' : '';

      var val = node.rawValue;
      var valHTML;
      if (val === null) {
        valHTML = '<span class="cj-null">null</span>';
      } else if (typeof val === 'boolean') {
        valHTML = '<span class="cj-boolean">' + val + '</span>';
      } else if (typeof val === 'number') {
        valHTML = '<span class="cj-number">' + val + '</span>';
      } else if (typeof val === 'string') {
        // Check for JWT (Pro feature), URL, or image
	        if (C.JWT && C.JWT.isProEnabled() && C.JWT.isJWT(val)) {
	          var jwtRender = C.JWT.renderJWT(val);
	          valHTML = jwtRender.full;
	        } else if (C.Tokenizer && C.Tokenizer.isImageURL(val)) {
          valHTML = '<span class="cj-string">"</span><span class="cj-image" data-img-src="' + escapeHTML(val) + '">' + escapeHTML(val) + '</span><span class="cj-string">"</span>';
        } else if (C.Tokenizer && C.Tokenizer.isURL(val)) {
          valHTML = '<span class="cj-string">"</span><a href="' + escapeHTML(val) + '" target="_blank" rel="noopener" class="cj-link">' + escapeHTML(val) + '</a><span class="cj-string">"</span>';
        } else {
          valHTML = '<span class="cj-string">' + node.value + '</span>';
        }
      } else {
        valHTML = '<span>' + node.value + '</span>';
      }

      return keyPart + '<span class="cj-value">' + valHTML + '</span>';
    }

    /**
     * Toggle collapse/expand for a node.
     */
    function toggleNode(path) {
      if (collapsedPaths[path]) {
        delete collapsedPaths[path];
      } else {
        collapsedPaths[path] = true;
      }
      rebuildViewModel();
      render();
    }

    /**
     * Expand all nodes.
     */
    function expandAll() {
      collapsedPaths = {};
      rebuildViewModel();
      render();
    }

    /**
     * Collapse all expandable nodes.
     */
    function collapseAll() {
      collapsedPaths = {};
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].hasChildren) {
          collapsedPaths[nodes[i].path] = true;
        }
      }
      rebuildViewModel();
      render();
    }

    function destroy() {
      isDestroyed = true;
      if (container) {
        container.removeEventListener('scroll', onScroll);
        container.innerHTML = '';
      }
      innerEl = null;
    }

    // --- utility ---

    function copyValue(val) {
      var text = typeof val === 'string' ? val : JSON.stringify(val, null, 2);
      navigator.clipboard.writeText(text).catch(function () {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      });
    }

    function showMiniToast(msg) {
      var t = document.querySelector('.cj-toast');
      if (t) t.remove();
      var toast = document.createElement('div');
      toast.className = 'cj-toast';
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(function () {
        toast.classList.add('cj-toast-out');
        setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
      }, 1200);
    }

    function escapeHTML(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    return {
      render: render,
      expandAll: expandAll,
      collapseAll: collapseAll,
      toggleNode: toggleNode,
      destroy: destroy,
      get viewModel() { return viewModel; },
      get collapsedPaths() { return collapsedPaths; }
    };
  }

  C.VirtualTree = {
    create: create
  };
})(ClearJSON);
