/**
 * ClearJSON Export Utilities
 *
 * Converts parsed JSON to various formats:
 *   - CSV (array of flat objects)
 *   - TSV (tab-separated)
 *   - YAML (basic)
 *   - TypeScript types (interface from JSON shape)
 *
 * CSV and TSV are Pro features.
 */

var ClearJSON = window.ClearJSON || {};

(function (C) {
  'use strict';

  /**
   * Convert an array of objects to CSV string.
   * Automatically detects columns from the first object.
   *
   * @param {Array<Object>} data — Array of flat(ish) objects
   * @returns {string} CSV string
   */
  function toCSV(data) {
    if (!Array.isArray(data) || data.length === 0) return '';

    // Collect all column keys from all objects (for sparse data)
    var columns = [];
    var seen = {};
    for (var i = 0; i < data.length; i++) {
      if (data[i] !== null && typeof data[i] === 'object' && !Array.isArray(data[i])) {
        var keys = Object.keys(data[i]);
        for (var j = 0; j < keys.length; j++) {
          if (!seen[keys[j]]) {
            seen[keys[j]] = true;
            columns.push(keys[j]);
          }
        }
      }
    }

    if (columns.length === 0) return '';

    var lines = [];

    // Header row
    lines.push(columns.map(escapeCSV).join(','));

    // Data rows
    for (var r = 0; r < data.length; r++) {
      var row = data[r];
      var values = [];
      for (var c = 0; c < columns.length; c++) {
        var val = (row !== null && typeof row === 'object') ? row[columns[c]] : null;
        values.push(csvValue(val));
      }
      lines.push(values.join(','));
    }

    return lines.join('\n');
  }

  function csvValue(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return escapeCSV(val);
    if (typeof val === 'object') return escapeCSV(JSON.stringify(val));
    return String(val);
  }

  function escapeCSV(str) {
    if (typeof str !== 'string') return String(str);
    if (str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  /**
   * Convert CSV to TSV by replacing commas with tabs.
   */
  function toTSV(data) {
    var csv = toCSV(data);
    if (!csv) return '';
    // Proper TSV conversion — handle quoted commas
    return csvToTSV(csv);
  }

  function csvToTSV(csv) {
    var lines = csv.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      result.push(parseCSVLine(lines[i]).join('\t'));
    }
    return result.join('\n');
  }

  function parseCSVLine(line) {
    var fields = [];
    var inQuotes = false;
    var current = '';

    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          fields.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    fields.push(current);
    return fields;
  }

  /**
   * Generate TypeScript type definitions from JSON data.
   *
   * @param {*} data — Parsed JSON value
   * @param {string} rootName — Root type name (default: 'Root')
   * @returns {string} TypeScript interface definitions
   */
  function toTypeScript(data, rootName) {
    rootName = rootName || 'Root';
    var interfaces = [];          // ordered list: { name, fields, fieldOrder }
    var structMap = {};           // signature → type name (deduplication)
    var nameCounter = {};         // base name → count (for unique naming)

    /**
     * Generate a unique type name.
     */
    function makeTypeName(base) {
      var name = capitalize(base);
      if (!nameCounter[name]) {
        nameCounter[name] = 1;
        return name;
      }
      nameCounter[name]++;
      return name + nameCounter[name];
    }

    /**
     * Generate a structural signature for an object.
     * Two objects with the same field names and types produce the same signature.
     */
    function structSig(keys, fieldTypes) {
      var sortedKeys = keys.slice().sort();
      var parts = [];
      for (var i = 0; i < sortedKeys.length; i++) {
        var k = sortedKeys[i];
        parts.push(k + ':' + fieldTypes[k]);
      }
      return parts.join('|');
    }

    /**
     * Recursively resolve type. Returns a TS type string.
     * Side effect: appends new interface definitions to `interfaces`.
     */
    function tsType(value, name) {
      if (value === null || value === undefined) return 'null';

      if (Array.isArray(value)) {
        if (value.length === 0) return 'any[]';
        // Sample all items (up to 20) for union type detection
        var itemTypes = [];
        var limit = Math.min(value.length, 20);
        for (var i = 0; i < limit; i++) {
          itemTypes.push(tsType(value[i], name + 'Item'));
        }
        // Deduplicate
        var unique = [];
        for (var j = 0; j < itemTypes.length; j++) {
          if (unique.indexOf(itemTypes[j]) === -1) unique.push(itemTypes[j]);
        }
        if (unique.length === 0) return 'any[]';
        if (unique.length === 1) return unique[0] + '[]';
        return '(' + unique.join(' | ') + ')[]';
      }

      if (typeof value === 'object') {
        var keys = Object.keys(value);
        if (keys.length === 0) return 'Record<string, never>';

        // Build field types first (recursively)
        var fieldTypes = {};
        var orderedFields = [];
        for (var k = 0; k < keys.length; k++) {
          var key = keys[k];
          var val = value[key];
          var fieldName = capitalize(name) + capitalize(key);
          var fType = tsType(val, fieldName);
          fieldTypes[key] = fType;
          orderedFields.push(key);
        }

        // Check if this structure already exists (deduplicate)
        var sig = structSig(keys, fieldTypes);
        if (structMap[sig]) return structMap[sig];

        // Create new type name
        var typeName = makeTypeName(name);
        structMap[sig] = typeName;

        // Build interface fields
        var fieldDefs = [];
        for (var m = 0; m < orderedFields.length; m++) {
          var fKey = orderedFields[m];
          var fVal = value[fKey];
          var fType = fieldTypes[fKey];
          var isOptional = fVal === null || fVal === undefined;
          var tsKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(fKey) ? fKey : '"' + fKey + '"';

          if (isOptional) {
            // If value is null, use `field?: Type` (optional)
            if (fType === 'null') {
              fieldDefs.push('  ' + tsKey + '?: any;');
            } else {
              fieldDefs.push('  ' + tsKey + '?: ' + fType + ';');
            }
          } else {
            fieldDefs.push('  ' + tsKey + ': ' + fType + ';');
          }
        }

        interfaces.push({ name: typeName, fields: fieldDefs });
        return typeName;
      }

      if (typeof value === 'string') return 'string';
      if (typeof value === 'number') return 'number';
      if (typeof value === 'boolean') return 'boolean';
      return 'any';
    }

    // Handle top-level array specially
    if (Array.isArray(data)) {
      var itemType = tsType(data.length > 0 ? data[0] : {}, rootName);
      // If root is array, use itemType as root and wrap
      tsType(data, rootName);
    } else {
      tsType(data, rootName);
    }

    // Build output: interfaces in dependency order (dependencies first, root last)
    var result = [];
    // Since we recurse depth-first, interfaces are already in dependency order.
    // Just need to reverse to put root last.
    for (var n = interfaces.length - 1; n >= 0; n--) {
      var iface = interfaces[n];
      result.push('interface ' + iface.name + ' {\n' + iface.fields.join('\n') + '\n}');
    }

    return result.join('\n\n');
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Basic JSON-to-YAML conversion.
   */
  function toYAML(data) {
    return yamlify(data, 0);
  }

  function yamlify(value, indent) {
    var prefix = '';
    for (var i = 0; i < indent; i++) prefix += '  ';

    if (value === null) return 'null';
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
      // If string contains special chars, quote it
      if (/[:\n"'#&*,?|<>=!%@`{}[\]]/.test(value) || value.length === 0) {
        return '"' + value.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
      }
      return value;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      var lines = [];
      for (var a = 0; a < value.length; a++) {
        var item = yamlify(value[a], indent + 1);
        lines.push(prefix + '- ' + item);
      }
      // If the first item is simple, put it inline
      if (value.length === 1 && typeof value[0] !== 'object' && value[0] !== null) {
        return lines[0].trim(); // remove prefix for inline array notation
      }
      return lines.join('\n');
    }

    if (typeof value === 'object') {
      var keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      var objLines = [];
      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        var val = value[key];
        if (typeof val === 'object' && val !== null) {
          objLines.push(prefix + key + ':');
          objLines.push(yamlify(val, indent + 1));
        } else {
          objLines.push(prefix + key + ': ' + yamlify(val, 0));
        }
      }
      return objLines.join('\n');
    }

    return String(value);
  }

  /**
   * Trigger a file download in the browser.
   *
   * @param {string} content — File content
   * @param {string} filename — Suggested filename
   * @param {string} mimeType — MIME type
   */
  function downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType || 'text/plain' });
    var url = URL.createObjectURL(blob);

    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  C.Export = {
    toCSV: toCSV,
    toTSV: toTSV,
    toTypeScript: toTypeScript,
    toYAML: toYAML,
    downloadFile: downloadFile
  };
})(ClearJSON);
