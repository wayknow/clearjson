/**
 * ClearJSON Core Exporter — Node.js edition.
 *
 * Pure functions for JSON → CSV/TSV/YAML/TypeScript conversion.
 * Mirrors the browser extension's export.js algorithms.
 */

// ─── CSV ────────────────────────────────────────────

/**
 * Convert an array of objects to CSV string.
 */
export function toCSV(data) {
  if (!Array.isArray(data) || data.length === 0) return '';

  const columns = [];
  const seen = {};
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== null && typeof data[i] === 'object' && !Array.isArray(data[i])) {
      const keys = Object.keys(data[i]);
      for (let j = 0; j < keys.length; j++) {
        if (!seen[keys[j]]) {
          seen[keys[j]] = true;
          columns.push(keys[j]);
        }
      }
    }
  }

  if (columns.length === 0) return '';

  const lines = [];
  lines.push(columns.map(escapeCSV).join(','));

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    const values = [];
    for (let c = 0; c < columns.length; c++) {
      const val = (row !== null && typeof row === 'object') ? row[columns[c]] : null;
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

// ─── TSV ────────────────────────────────────────────

export function toTSV(data) {
  const csv = toCSV(data);
  if (!csv) return '';
  const lines = csv.split('\n');
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    result.push(parseCSVLine(lines[i]).join('\t'));
  }
  return result.join('\n');
}

function parseCSVLine(line) {
  const fields = [];
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
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

// ─── TypeScript ─────────────────────────────────────

export function toTypeScript(data, rootName = 'Root') {
  const interfaces = [];
  const structMap = {};
  const nameCounter = {};

  function makeTypeName(base) {
    const name = capitalize(base);
    if (!nameCounter[name]) {
      nameCounter[name] = 1;
      return name;
    }
    nameCounter[name]++;
    return name + nameCounter[name];
  }

  function structSig(keys, fieldTypes) {
    const sortedKeys = keys.slice().sort();
    const parts = [];
    for (let i = 0; i < sortedKeys.length; i++) {
      const k = sortedKeys[i];
      parts.push(k + ':' + fieldTypes[k]);
    }
    return parts.join('|');
  }

  function tsType(value, name) {
    if (value === null || value === undefined) return 'null';

    if (Array.isArray(value)) {
      if (value.length === 0) return 'any[]';
      const itemTypes = [];
      const limit = Math.min(value.length, 20);
      for (let i = 0; i < limit; i++) {
        itemTypes.push(tsType(value[i], name + 'Item'));
      }
      const unique = [];
      for (let j = 0; j < itemTypes.length; j++) {
        if (unique.indexOf(itemTypes[j]) === -1) unique.push(itemTypes[j]);
      }
      if (unique.length === 0) return 'any[]';
      if (unique.length === 1) return unique[0] + '[]';
      return '(' + unique.join(' | ') + ')[]';
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return 'Record<string, never>';

      const fieldTypes = {};
      const orderedFields = [];
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        const val = value[key];
        const fieldName = capitalize(name) + capitalize(key);
        const fType = tsType(val, fieldName);
        fieldTypes[key] = fType;
        orderedFields.push(key);
      }

      const sig = structSig(keys, fieldTypes);
      if (structMap[sig]) return structMap[sig];

      const typeName = makeTypeName(name);
      structMap[sig] = typeName;

      const fieldDefs = [];
      for (let m = 0; m < orderedFields.length; m++) {
        const fKey = orderedFields[m];
        const fVal = value[fKey];
        const fType = fieldTypes[fKey];
        const isOptional = fVal === null || fVal === undefined;
        const tsKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(fKey) ? fKey : '"' + fKey + '"';

        if (isOptional) {
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

  if (Array.isArray(data)) {
    tsType(data, rootName);
  } else {
    tsType(data, rootName);
  }

  const result = [];
  for (let n = interfaces.length - 1; n >= 0; n--) {
    const iface = interfaces[n];
    result.push('interface ' + iface.name + ' {\n' + iface.fields.join('\n') + '\n}');
  }

  return result.join('\n\n');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── YAML ───────────────────────────────────────────

export function toYAML(data) {
  return yamlify(data, 0);
}

function yamlify(value, indent) {
  let prefix = '';
  for (let i = 0; i < indent; i++) prefix += '  ';

  if (value === null) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (/[:\n"'#&*,?|<>=!%@`{}[\]]/.test(value) || value.length === 0) {
      return '"' + value.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const lines = [];
    for (let a = 0; a < value.length; a++) {
      const item = yamlify(value[a], indent + 1);
      lines.push(prefix + '- ' + item);
    }
    if (value.length === 1 && typeof value[0] !== 'object' && value[0] !== null) {
      return lines[0].trim();
    }
    return lines.join('\n');
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    const objLines = [];
    for (let k = 0; k < keys.length; k++) {
      const key = keys[k];
      const val = value[key];
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
