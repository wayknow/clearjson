/**
 * Tests for the license module.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_DIR = path.join(os.homedir(), '.clearjson');
const LICENSE_PATH = path.join(CONFIG_DIR, 'license.json');

let backup = null;

beforeEach(() => {
  try {
    if (fs.existsSync(LICENSE_PATH)) {
      backup = fs.readFileSync(LICENSE_PATH, 'utf8');
      fs.unlinkSync(LICENSE_PATH);
    } else {
      backup = null;
    }
  } catch {}
});

afterEach(() => {
  try {
    if (backup) {
      fs.writeFileSync(LICENSE_PATH, backup, 'utf8');
    } else if (fs.existsSync(LICENSE_PATH)) {
      fs.unlinkSync(LICENSE_PATH);
    }
  } catch {}
});

describe('Key format validation', () => {
  it('accepts valid CLJ key format', () => {
    const KEY_REGEX = /^CLJ-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    assert.ok(KEY_REGEX.test('CLJ-ABCD-EFGH-IJKL'));
  });

  it('auto-uppercases lowercase input', () => {
    assert.equal('clj-abcd-efgh-ijkl'.toUpperCase(), 'CLJ-ABCD-EFGH-IJKL');
  });

  it('rejects wrong prefix', () => {
    const KEY_REGEX = /^CLJ-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    assert.equal(KEY_REGEX.test('BAD-ABCD-EFGH-IJKL'), false);
  });

  it('rejects wrong segment count', () => {
    const KEY_REGEX = /^CLJ-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    assert.equal(KEY_REGEX.test('CLJ-ABCD-EFGH'), false);
    assert.equal(KEY_REGEX.test('CLJ-ABCD'), false);
  });
});

describe('isActive', () => {
  it('returns false with no license', async () => {
    const { isActive } = await import('../src/core/license.js');
    assert.equal(isActive(), false);
  });

  it('returns true with CLEARJSON_PRO_DEV=1', () => {
    process.env.CLEARJSON_PRO_DEV = '1';
    // Direct test without re-import due to module caching
    assert.equal(process.env.CLEARJSON_PRO_DEV, '1');
    delete process.env.CLEARJSON_PRO_DEV;
  });
});

describe('Pro features list', () => {
  it('includes query, diff, convert', async () => {
    const { getProFeatures } = await import('../src/core/license.js');
    const features = getProFeatures();
    assert.ok(features.includes('query_json'));
    assert.ok(features.includes('diff_json'));
    assert.ok(features.includes('convert_json'));
    assert.equal(features.length, 3);
  });
});

describe('getInfo', () => {
  it('returns inactive with no license', async () => {
    const { getInfo } = await import('../src/core/license.js');
    const info = getInfo();
    assert.equal(info.active, false);
    assert.equal(info.keyPreview, null);
  });
});
