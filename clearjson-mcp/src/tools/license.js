/**
 * License management tools — activate_license, license_status, deactivate_license
 */

import { activate, isActive, getInfo, removeLicense } from '../core/license.js';

export const activateLicenseSchema = {
  name: 'activate_license',
  description: 'Activate a ClearJSON Pro license key (CLJ-XXXX-XXXX-XXXX). ' +
    'Unlocks query_json, diff_json, and convert_json tools. ' +
    'One license covers up to 3 devices. $29 lifetime at wayknow.tech/clearjson.html.',
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'Your Pro license key in format CLJ-XXXX-XXXX-XXXX.'
      }
    },
    required: ['key']
  }
};

export async function activateLicense(args) {
  const { key } = args;
  const result = await activate(key);

  if (result.ok) {
    let text = '✓ Pro activated!\n';
    if (result.email) text += `  License: ${result.email}\n`;
    if (result.offline) text += `  ⚠ ${result.warning}\n`;
    text += '\n  Pro tools unlocked: query_json, diff_json, convert_json';
    return { content: [{ type: 'text', text }] };
  } else {
    return {
      content: [{ type: 'text', text: `✗ Activation failed: ${result.error}` }],
      isError: true
    };
  }
}

// ─── license_status ────────────────────────────────

export const licenseStatusSchema = {
  name: 'license_status',
  description: 'Check ClearJSON Pro license status — activation state, email, device count, offline/online.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

export async function licenseStatus() {
  const info = getInfo();

  if (!info.active) {
    let text = 'No Pro license activated.\n\n';
    text += 'Free tools available: format_json, minify_json, validate_json, search_json\n';
    text += 'Pro tools (require license): query_json, diff_json, convert_json\n\n';
    text += 'Get a license: $29 lifetime at wayknow.tech/clearjson.html\n';
    text += 'Or activate: activate_license with key CLJ-XXXX-XXXX-XXXX';
    return { content: [{ type: 'text', text }] };
  }

  let text = '✓ Pro Active\n';
  text += `  Key: ${info.keyPreview}\n`;
  text += `  Email: ${info.email || '(offline — not verified)'}\n`;
  text += `  Devices: ${info.activations}/${info.maxDevices}\n`;
  text += `  Mode: ${info.offline ? 'Offline (server unreachable last check)' : 'Online (verified)'}\n\n`;
  text += 'Pro tools unlocked: query_json, diff_json, convert_json';
  return { content: [{ type: 'text', text }] };
}

// ─── deactivate_license ────────────────────────────

export const deactivateLicenseSchema = {
  name: 'deactivate_license',
  description: 'Remove the Pro license from this machine. Frees up a device slot.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

export async function deactivateLicense() {
  const info = getInfo();
  if (!info.active) {
    return { content: [{ type: 'text', text: 'No license to deactivate.' }] };
  }

  removeLicense();
  return { content: [{ type: 'text', text: '✓ License removed. Pro tools are no longer available on this machine.' }] };
}
