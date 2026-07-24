/**
 * ClearJSON Core Parser — Node.js edition.
 *
 * Pure functions, zero DOM dependencies.
 * Mirrors the browser extension's parser.js algorithm.
 */

/**
 * Parse JSON text with enhanced error reporting.
 *
 * @param {string} text - Raw JSON string
 * @returns {{ ok: true, data: any, stats: object } | { ok: false, error: string, line: number, column: number }}
 */
export function parse(text) {
  const startTime = performance.now();
  const trimmed = text.trim();

  try {
    const data = JSON.parse(trimmed);
    const elapsed = performance.now() - startTime;
    const stats = computeStats(data, text);

    return {
      ok: true,
      data,
      stats: {
        nodes: stats.nodes,
        maxDepth: stats.maxDepth,
        sizeBytes: Buffer.byteLength(text, 'utf8'),
        parseTimeMs: Math.round(elapsed * 100) / 100
      }
    };
  } catch (e) {
    let line = 1;
    let column = 1;

    if (e instanceof SyntaxError) {
      // Try legacy format: "Unexpected token X at position N"
      const posMatch = e.message.match(/position\s+(\d+)/i);
      if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        const before = trimmed.substring(0, pos);
        line = (before.match(/\n/g) || []).length + 1;
        const lastNewline = before.lastIndexOf('\n');
        column = lastNewline === -1 ? pos + 1 : pos - lastNewline;
      } else {
        // Node v26+ format: 'Unexpected token "X", "...snippet..." is not valid JSON'
        // or with truncation: 'Unexpected token "X", ..."...snippet..." is not valid JSON'
        const snippetMatch = e.message.match(/, (?:\.\.\.)?"(.+)" is not valid JSON$/s);
        if (snippetMatch) {
          const snippet = snippetMatch[1];
          const idx = trimmed.indexOf(snippet);
          if (idx !== -1) {
            const before = trimmed.substring(0, idx);
            line = (before.match(/\n/g) || []).length + 1;
            const lastNewline = before.lastIndexOf('\n');
            column = lastNewline === -1 ? idx + 1 : idx - lastNewline;
          }
        }
      }
    }

    return {
      ok: false,
      error: e.message,
      line,
      column
    };
  }
}

/**
 * Traverse parsed JSON to compute node count and max depth.
 */
export function computeStats(data, rawText) {
  let nodes = 0;
  let maxDepth = 0;

  function walk(value, depth) {
    nodes++;
    if (depth > maxDepth) maxDepth = depth;

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        walk(value[i], depth + 1);
      }
    } else if (value !== null && typeof value === 'object') {
      const keys = Object.keys(value);
      for (let i = 0; i < keys.length; i++) {
        walk(value[keys[i]], depth + 1);
      }
    }
  }

  walk(data, 1);
  return { nodes, maxDepth };
}

/**
 * Format JSON with indentation.
 */
export function format(data, indent = 2) {
  return JSON.stringify(data, null, indent);
}

/**
 * Minify/compress JSON.
 */
export function minify(data) {
  return JSON.stringify(data);
}
