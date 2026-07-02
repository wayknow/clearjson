/**
 * ClearJSON Tokenizer — lightweight syntax highlighting.
 *
 * Walks a JSON string character-by-character and produces
 * an array of { type, value } tokens for DOM rendering.
 *
 * Token types:
 *   'key'       — object key
 *   'string'    — string value
 *   'number'    — number value
 *   'boolean'   — true / false
 *   'null'      — null
 *   'punctuation' — { } [ ] : ,
 *   'link'      — string that looks like a URL
 *   'image'     — string that looks like an image URL
 */

var ClearJSON = window.ClearJSON || {};

(function (C) {
  'use strict';

  var URL_RE = /^https?:\/\/[^\s"'<>]+$/i;
  var IMAGE_RE = /\.(png|jpg|jpeg|gif|svg|webp|ico|bmp)(\?.*)?$/i;

  function isURL(str) {
    return str.length < 2048 && URL_RE.test(str);
  }

  function isImageURL(str) {
    return isURL(str) && IMAGE_RE.test(str.split('?')[0]);
  }

  /**
   * Tokenize a JSON string for syntax highlighting.
   *
   * @param {string} jsonText — The raw (formatted) JSON string
   * @returns {Array<{type: string, value: string}>}
   */
  function tokenize(jsonText) {
    var tokens = [];
    var i = 0;
    var len = jsonText.length;

    while (i < len) {
      var ch = jsonText[i];

      // Whitespace — preserve as-is
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        var start = i;
        while (i < len && (jsonText[i] === ' ' || jsonText[i] === '\t' || jsonText[i] === '\n' || jsonText[i] === '\r')) {
          i++;
        }
        tokens.push({ type: 'whitespace', value: jsonText.substring(start, i) });
        continue;
      }

      // Punctuation
      if (ch === '{' || ch === '}' || ch === '[' || ch === ']' || ch === ':' || ch === ',') {
        tokens.push({ type: 'punctuation', value: ch });
        i++;
        continue;
      }

      // Double-quoted string (key or value)
      if (ch === '"') {
        var strStart = i;
        i++; // skip opening quote
        while (i < len) {
          if (jsonText[i] === '\\') {
            i += 2; // skip escaped char
          } else if (jsonText[i] === '"') {
            i++; // skip closing quote
            break;
          } else {
            i++;
          }
        }
        var fullStr = jsonText.substring(strStart, i);

        // Determine if this is a key or a value
        // A key is followed by : (with optional whitespace)
        var after = i;
        while (after < len && (jsonText[after] === ' ' || jsonText[after] === '\t' || jsonText[after] === '\n' || jsonText[after] === '\r')) {
          after++;
        }
        if (jsonText[after] === ':') {
          tokens.push({ type: 'key', value: fullStr });
        } else {
          // Check if it's a URL or image
          var inner = fullStr.slice(1, -1); // strip quotes
          if (isImageURL(inner)) {
            tokens.push({ type: 'image', value: fullStr });
          } else if (isURL(inner)) {
            tokens.push({ type: 'link', value: fullStr });
          } else {
            tokens.push({ type: 'string', value: fullStr });
          }
        }
        continue;
      }

      // Numbers: -?\d+ (\.\d+)? ([eE][+-]?\d+)?
      if (ch === '-' || (ch >= '0' && ch <= '9')) {
        var numStart = i;
        if (ch === '-') i++;
        while (i < len && jsonText[i] >= '0' && jsonText[i] <= '9') i++;
        if (i < len && jsonText[i] === '.') {
          i++;
          while (i < len && jsonText[i] >= '0' && jsonText[i] <= '9') i++;
        }
        if (i < len && (jsonText[i] === 'e' || jsonText[i] === 'E')) {
          i++;
          if (jsonText[i] === '+' || jsonText[i] === '-') i++;
          while (i < len && jsonText[i] >= '0' && jsonText[i] <= '9') i++;
        }
        tokens.push({ type: 'number', value: jsonText.substring(numStart, i) });
        continue;
      }

      // true / false / null
      if (ch === 't' && jsonText.substring(i, i + 4) === 'true') {
        tokens.push({ type: 'boolean', value: 'true' });
        i += 4;
        continue;
      }
      if (ch === 'f' && jsonText.substring(i, i + 5) === 'false') {
        tokens.push({ type: 'boolean', value: 'false' });
        i += 5;
        continue;
      }
      if (ch === 'n' && jsonText.substring(i, i + 4) === 'null') {
        tokens.push({ type: 'null', value: 'null' });
        i += 4;
        continue;
      }

      // Fallback — any unrecognized character
      tokens.push({ type: 'unknown', value: ch });
      i++;
    }

    return tokens;
  }

  /**
   * Render tokenized output as an HTML string with <span> elements.
   *
   * @param {string} jsonText
   * @param {boolean} withLineNumbers
   * @returns {string} HTML string
   */
  function toHTML(jsonText, withLineNumbers) {
    var tokens = tokenize(jsonText);
    var lines = jsonText.split('\n');
    var totalLines = lines.length;
    var lineNumWidth = String(totalLines).length;

    // Build line number gutter
    var gutterHTML = '';
    if (withLineNumbers) {
      var gutterLines = [];
      for (var l = 1; l <= totalLines; l++) {
        gutterLines.push('<span class="cj-ln">' + String(l) + '</span>');
      }
      gutterHTML = '<div class="cj-gutter">' + gutterLines.join('\n') + '</div>';
    }

    var codeHTML = '';
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      var escaped = escapeHTML(t.value);

      switch (t.type) {
        case 'key':
          codeHTML += '<span class="cj-key">' + escaped + '</span>';
          break;
        case 'string':
          codeHTML += '<span class="cj-string">' + escaped + '</span>';
          break;
        case 'number':
          codeHTML += '<span class="cj-number">' + escaped + '</span>';
          break;
        case 'boolean':
          codeHTML += '<span class="cj-boolean">' + escaped + '</span>';
          break;
        case 'null':
          codeHTML += '<span class="cj-null">' + escaped + '</span>';
          break;
        case 'punctuation':
          codeHTML += '<span class="cj-punct">' + escaped + '</span>';
          break;
        case 'link':
          var href = escaped.slice(1, -1); // strip quotes
          codeHTML += '<span class="cj-link">"<a href="' + href + '" target="_blank" rel="noopener">' + href + '</a>"</span>';
          break;
        case 'image':
          var imgSrc = escaped.slice(1, -1);
          codeHTML += '<span class="cj-image">"' + imgSrc + '" <span class="cj-img-preview"><img src="' + imgSrc + '" loading="lazy" /></span></span>';
          break;
        default:
          codeHTML += escaped;
      }
    }

    var html = '';
    if (gutterHTML) {
      html += '<div class="cj-code-wrapper">' + gutterHTML + '<div class="cj-code">' + codeHTML + '</div></div>';
    } else {
      html += '<div class="cj-code">' + codeHTML + '</div>';
    }

    return html;
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  C.Tokenizer = {
    tokenize: tokenize,
    toHTML: toHTML,
    isURL: isURL,
    isImageURL: isImageURL
  };
})(ClearJSON);
