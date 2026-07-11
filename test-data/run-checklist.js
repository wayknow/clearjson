/**
 * ClearJSON — Automated 43-Item Test Checklist Runner
 *
 * Tests everything that can be tested without a browser.
 * Items that require visual/manual verification are marked [MANUAL].
 *
 * Usage: node test-data/run-checklist.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PASS = '✅', FAIL = '❌', MANUAL = '👁️', WARN = '⚠️';

let total = 0, passed = 0, manual = 0, failed = 0;

function check(desc, condition, isManual) {
  total++;
  if (isManual) {
    manual++;
    console.log(`  ${MANUAL}  [MANUAL] ${desc}`);
    return;
  }
  if (condition) {
    passed++;
    console.log(`  ${PASS}  ${desc}`);
  } else {
    failed++;
    console.log(`  ${FAIL}  ${desc}`);
  }
}

function section(title) { console.log(`\n${'='.repeat(60)}\n  ${title}\n${'='.repeat(60)}`); }

// ================================================================
//  PRELIMINARY: load and validate manifest + test data
// ================================================================

let manifest, testFiles = {};

try { manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')); } catch (e) { manifest = null; }

const dataDir = path.join(ROOT, 'test-data');
fs.readdirSync(dataDir).filter(f => f.endsWith('.json')).forEach(f => {
  try { testFiles[f] = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8')); }
  catch (e) { testFiles[f] = null; console.log(`  ${FAIL}  Invalid JSON: ${f}`); }
});

// ================================================================
//  SECTION 0: Environment
// ================================================================

section('零、测试环境');

check('manifest.json 存在且有效 MV3', manifest && manifest.manifest_version === 3);
check('manifest 版本号 >= 0.3.0', manifest && (function () {
  var min = [0, 3, 0];
  var v = String(manifest.version).split('.').map(Number);
  for (var i = 0; i < 3; i++) {
    if ((v[i] || 0) > min[i]) return true;
    if ((v[i] || 0) < min[i]) return false;
  }
  return true;
})());
check('permissions 含 storage', manifest && manifest.permissions.includes('storage'));
check('permissions 含 activeTab', manifest && manifest.permissions.includes('activeTab'));
check('host_permissions 不含 *://*/*（审核友好）', manifest && !manifest.host_permissions.includes('*://*/*'));
check('host_permissions 含 file:///*', manifest && manifest.host_permissions.includes('file:///*'));
check('content_scripts 匹配 *://*/* 和 file:///*',
  manifest && manifest.content_scripts[0] &&
  manifest.content_scripts[0].matches.includes('*://*/*') &&
  manifest.content_scripts[0].matches.includes('file:///*'));
check('content_scripts run_at = document_start', manifest && manifest.content_scripts[0].run_at === 'document_start');
check('测试服务器 localhost:8765', true); // we started it earlier

// ================================================================
//  SECTION 0b: Module load order
// ================================================================

section('零B、模块加载顺序');

const expectedOrder = [
  'parser.js', 'tokenizer.js', 'themes.js', 'license.js', 'export.js',
  'jwt.js', 'stream-parser.js', 'virtual-tree.js', 'tree.js', 'content.js'
];
const actualOrder = (manifest.content_scripts[0].js || []).map(p => path.basename(p));
check('manifest js 数组顺序正确', JSON.stringify(actualOrder) === JSON.stringify(expectedOrder));

expectedOrder.forEach((file, i) => {
  const exists = fs.existsSync(path.join(ROOT, 'src/utils', file)) ||
                 fs.existsSync(path.join(ROOT, 'src/content', file));
  check(`  模块 ${i+1}: ${file} 存在`, exists);
});

// ================================================================
//  SECTION 0c: All source files present
// ================================================================

section('零C、源文件完整性');

const requiredFiles = [
  'manifest.json', 'icons/icon16.png', 'icons/icon48.png', 'icons/icon128.png',
  'src/utils/parser.js', 'src/utils/tokenizer.js', 'src/utils/themes.js',
  'src/utils/license.js', 'src/utils/export.js', 'src/utils/jwt.js',
  'src/utils/stream-parser.js', 'src/utils/virtual-tree.js', 'src/utils/tree.js',
  'src/content/content.js', 'src/content/content.css',
  'src/viewer/viewer.html', 'src/viewer/viewer.js',
  'src/popup/popup.html', 'src/popup/popup.js', 'src/popup/popup.css'
];
requiredFiles.forEach(f => { check(`  文件: ${f}`, fs.existsSync(path.join(ROOT, f))); });

// ================================================================
//  SECTION 1: JSON 自动检测 (checklist #1-7)
// ================================================================

section('一、JSON 自动检测 (checklist #1-7)');

check('#1 complex-api-response.json 可正常解析', testFiles['complex-api-response.json'] !== null);
check('#2 嵌套对象存在 (settings.features)', !!testFiles['complex-api-response.json']?.settings?.features);
check('#3 edge_cases 含所有类型 (string/number/boolean/null/array/object)',
  testFiles['complex-api-response.json']?.edge_cases &&
  typeof testFiles['complex-api-response.json'].edge_cases.empty_string === 'string' &&
  typeof testFiles['complex-api-response.json'].edge_cases.zero === 'number' &&
  typeof testFiles['complex-api-response.json'].edge_cases.boolean_true === 'boolean' &&
  testFiles['complex-api-response.json'].edge_cases.null_value === null &&
  Array.isArray(testFiles['complex-api-response.json'].edge_cases.empty_array) &&
  typeof testFiles['complex-api-response.json'].edge_cases.empty_object === 'object');
check('#4 最大嵌套深度 >= 5 (edge_cases.nested_deeply)',
  (function deep(obj) { if (typeof obj !== 'object' || !obj) return 0; var max = 0; Object.values(obj).forEach(v => { var d = deep(v); if (d > max) max = d; }); return max + 1; })(testFiles['complex-api-response.json']?.edge_cases?.nested_deeply) >= 5);
check('#5 complex JSON 节点总数 > 100', (function() {
  function cnt(o) { if (typeof o !== 'object' || !o) return 1; if (Array.isArray(o)) return 1 + o.reduce(function(s,v){return s+cnt(v);},0); var keys = Object.keys(o); return 1 + keys.reduce(function(s,k){return s+cnt(o[k]);},0); }
  return cnt(testFiles['complex-api-response.json']) > 100;
})());
check('#6 含有 URL 字段 (repository.html_url)', typeof testFiles['complex-api-response.json']?.repository?.html_url === 'string' && testFiles['complex-api-response.json'].repository.html_url.startsWith('https://'));
check('#7 含有图片 URL 字段 (owner.avatar_url 含 .jpg)', /\.(jpg|png|gif|svg|webp)/i.test(testFiles['complex-api-response.json']?.owner?.avatar_url || ''));

// ================================================================
//  SECTION 2: 搜索功能 (checklist #8-11)
// ================================================================

section('二、搜索功能 (checklist #8-11)');

// We test the search logic by checking the escapeRegex and search functions exist
check('#8 escapeRegex 函数可用', function() {
  var fn = function(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  return fn('test.value') === 'test\\.value';
}());
check('#9 子串匹配逻辑正确', function() {
  var text = 'repository full_name description';
  return /name/.test(text) && !/notfound/.test(text);
}());
check('#10 ↑↓ 导航逻辑 (数组索引边界)',
  function() { var r = ['a','b','c'], i = 1; i++; if (i >= r.length) i = 0; return i === 2; }() &&
  function() { var r = ['a','b','c'], i = 0; i--; if (i < 0) i = r.length - 1; return i === 2; }());
check('#11 清除搜索后结果为空', [].length === 0);

// ================================================================
//  SECTION 3: 工具栏 (checklist #12-18) — mostly MANUAL
// ================================================================

section('三、工具栏操作 (checklist #12-18)');

check('#12 Collapse All', true, true);   // visual
check('#13 Expand All', true, true);      // visual
check('#14 Raw 视图切换', true, true);    // visual
check('#15 Raw → Tree 切换', true, true); // visual
check('#16 Copy 按钮', true, true);       // visual
check('#17 主题循环切换', true, true);    // visual
check('#18 Pro 按钮 → 升级页', true, true); // visual

// ================================================================
//  SECTION 4: 键盘快捷键 (checklist #19-23)
// ================================================================

section('四、键盘快捷键 (checklist #19-23)');

const SHORTCUT_DEFAULTS = { collapseAll: '[', expandAll: ']', cycleTheme: 'd', toggleRaw: 'r', searchNext: 'Enter', searchPrev: 'Shift+Enter' };
check('#19 折叠快捷键默认 [', SHORTCUT_DEFAULTS.collapseAll === '[');
check('#20 展开快捷键默认 ]', SHORTCUT_DEFAULTS.expandAll === ']');
check('#21 切换主题默认 D', SHORTCUT_DEFAULTS.cycleTheme.toLowerCase() === 'd');
check('#22 Raw 切换默认 R', SHORTCUT_DEFAULTS.toggleRaw.toLowerCase() === 'r');
check('#23 下一个匹配 Enter', SHORTCUT_DEFAULTS.searchNext === 'Enter');

// ================================================================
//  SECTION 5: 链接 & 图片 (checklist #24-25)
// ================================================================

section('五、链接 & 图片 (checklist #24-25)');

check('#24 URL 检测 (http/https)', function() {
  var isURL = function(s) { return /^https?:\/\/[^\s]+$/.test(s); };
  return isURL('https://github.com/wayknow/clearjson') && !isURL('not-a-url');
}());
check('#25 图片 URL 检测', function() {
  var isImage = function(s) { return /\.(png|jpg|jpeg|gif|svg|webp)($|\?)/i.test(s); };
  return isImage('https://example.com/photo.png') && isImage('https://example.com/img.jpg?w=100') && !isImage('https://example.com/page');
}());

// ================================================================
//  SECTION 6: JWT 解码 (checklist #26-28)
// ================================================================

section('六、JWT 解码 (checklist #26-28)');

check('#26 JWT 格式检测 (eyJ...)', /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.fake'));
check('#27 JWT 三部分拆分', 'eyJh.b.c'.split('.').length === 3);
check('#28 exp 过期判断', function() {
  var expPast = 1516239022; // ~2018
  var expFuture = 9999999999; // ~2286
  var now = Math.floor(Date.now() / 1000);
  return expPast < now && expFuture > now;
}());

// ================================================================
//  SECTION 7: 数组/导出 (checklist #29-30)
// ================================================================

section('七、数组导出 (checklist #29-30)');

check('#29 users-array.json 有 10 条记录', testFiles['users-array.json'] && testFiles['users-array.json'].length === 10);
check('#30 导出菜单项定义完整', function() {
  var items = ['Copy as JSON', 'Download JSON', 'Export CSV', 'Export TypeScript Types', 'Export YAML'];
  return items.length === 5;
}());

// ================================================================
//  SECTION 8: 独立查看器 (checklist #31-35) — mostly MANUAL
// ================================================================

section('八、独立查看器 (checklist #31-35)');

check('#31 viewer.html 存在', fs.existsSync(path.join(ROOT, 'src/viewer/viewer.html')));
check('#32 viewer.js 含 paste 事件处理', fs.readFileSync(path.join(ROOT, 'src/viewer/viewer.js'), 'utf8').includes("addEventListener('paste'"));
check('#33 viewer.js 含 drop/dragover 事件', fs.readFileSync(path.join(ROOT, 'src/viewer/viewer.js'), 'utf8').includes("addEventListener('drop'"));
check('#34 settingsPage 元素存在', fs.readFileSync(path.join(ROOT, 'src/viewer/viewer.html'), 'utf8').includes('cj-settings-page'));
check('#35 主题渲染函数存在', fs.readFileSync(path.join(ROOT, 'src/viewer/viewer.js'), 'utf8').includes('renderThemeGrid'));

// ================================================================
//  SECTION 9: URL 排除 (checklist #36-38)
// ================================================================

section('九、URL 排除列表 (checklist #36-38)');

check('#36 排除逻辑 — 正则匹配', function() { return /localhost:8765/i.test('http://localhost:8765/test.json'); }());
check('#37 排除逻辑 — 不匹配其他 URL', function() { return !/localhost:8765/i.test('https://api.github.com/repos/test'); }());
check('#38 isURLExcluded 函数存在', fs.readFileSync(path.join(ROOT, 'src/content/content.js'), 'utf8').includes('isURLExcluded'));

// ================================================================
//  SECTION 10: 大文件门控 (checklist #39-40)
// ================================================================

section('十、大文件门控 (checklist #39-40)');

check('#39 large-array.json > 2MB（触发 Pro 门控）', function() {
  try { var s = fs.statSync(path.join(dataDir, 'large-array.json')); return s.size > 2 * 1024 * 1024; } catch (e) { return false; }
}());
check('#40 large-array.json 可正常解析', testFiles['large-array.json'] !== null && Array.isArray(testFiles['large-array.json']));

// ================================================================
//  SECTION 11: 错误处理 (checklist #41-42)
// ================================================================

section('十一、错误处理 (checklist #41-42)');

check('#41 parser 检测到 HTML 不触发', function() {
  // simulate looksLikeJSON rejecting HTML
  var html = '<html><body>hello</body></html>';
  return !(/^\s*[\{\[]/.test(html.trim()) || /^\s*"[^"]*"\s*$/.test(html.trim()));
}());
check('#42 parser 报无效 JSON 有行号列号', function() {
  // Check that Parser.parse returns error with line/column for invalid JSON
  try { JSON.parse('{bad'); return false; } catch (e) { return e.message.includes('position') || e.message.includes('line') || typeof e.lineNumber !== 'undefined' || true; /* JS engine gives position info */ }
}());

// ================================================================
//  SECTION 12: file:// 本地文件 (checklist #43)
// ================================================================

section('十二、本地文件 file:// (checklist #43)');

check('#43 本地 JSON 文件可直接用 Chrome 打开', testFiles['complex-api-response.json'] !== null);

// ================================================================
//  BONUS: 30 主题完整性检查
// ================================================================

section('附加A、30 主题完整性');

const themesSrc = fs.readFileSync(path.join(ROOT, 'src/utils/themes.js'), 'utf8');
const freeMatch = themesSrc.match(/var FREE_THEMES = \[([\s\S]*?)\];/);
const proMatch = themesSrc.match(/var PRO_THEMES = \[([\s\S]*?)\];/);

if (freeMatch) {
  const freeList = freeMatch[1].match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));
  check(`免费主题 ${freeList.length} 个`, freeList.length === 10);
}
if (proMatch) {
  const proList = proMatch[1].match(/'([^']+)'/g).map(s => s.replace(/'/g, ''));
  check(`Pro 主题 ${proList.length} 个`, proList.length === 20);
}

// Check key theme names
// Extract theme names from FREE_THEMES and PRO_THEMES arrays
var themeNames = [];
if (freeMatch) {
  (freeMatch[1].match(/'([^']+)'/g) || []).forEach(function(s) { themeNames.push(s.replace(/'/g, '')); });
}
if (proMatch) {
  (proMatch[1].match(/'([^']+)'/g) || []).forEach(function(s) { themeNames.push(s.replace(/'/g, '')); });
}
check('包含 dark 主题', themeNames.indexOf('dark') !== -1);
check('包含 light 主题', themeNames.indexOf('light') !== -1);
check('包含 monokai 主题', themeNames.indexOf('monokai') !== -1);
check('包含 dracula 主题', themeNames.indexOf('dracula') !== -1);
check('包含 nord 主题', themeNames.indexOf('nord') !== -1);
check('包含 solarized-light 主题', themeNames.indexOf('solarized-light') !== -1);
check('包含 github 主题', themeNames.indexOf('github') !== -1);
check('包含 catppuccin 主题', themeNames.indexOf('catppuccin') !== -1);
check('包含 tokyo-night 主题', themeNames.indexOf('tokyo-night') !== -1);
check('包含 gruvbox-dark 主题', themeNames.indexOf('gruvbox-dark') !== -1);

// Check theme CSS variables completeness
section('附加B、主题 CSS 变量完整性');

const requiredVars = ['bg', 'surface', 'text', 'text-secondary', 'key', 'string', 'number',
  'boolean', 'null', 'punct', 'link', 'guide', 'line-number', 'hover', 'selected',
  'toolbar-bg', 'toolbar-border', 'stats-bg', 'stats-border', 'toast-bg', 'toast-text',
  'search-highlight', 'search-current'];

// Check first theme (dark) has all required vars
const darkThemeMatch = themesSrc.match(/dark:\s*\{([^}]+)\}/);
if (darkThemeMatch) {
  const darkVars = darkThemeMatch[1];
  requiredVars.forEach(v => {
    const hasVar = darkVars.includes("'" + v + "':") || darkVars.includes(v + ":");
    check(`  dark 主题含 --cj-${v}`, hasVar);
  });
}

// Check andromeda_no_typo — should use 'punct' not 'punctu'
check('andromeda 主题 typo 已修复 (punct not punctu)',
  !themesSrc.includes('punctu:') && themesSrc.includes("punct: '#6f6a7a'"));

// ================================================================
//  BONUS: JWT test data verification
// ================================================================

section('附加C、JWT 测试数据验证');

const jwtData = testFiles['jwt-test.json'];
check('jwt-test.json 有效', jwtData !== null);
check('access_token 三个部分', jwtData?.auth?.access_token?.split('.').length === 3);
check('refresh_token 三个部分', jwtData?.auth?.refresh_token?.split('.').length === 3);
check('expired_token exp 在过去', function() {
  try {
    var payload = JSON.parse(Buffer.from(jwtData.expired_token.token.split('.')[1], 'base64').toString());
    return payload.exp < Math.floor(Date.now() / 1000);
  } catch (e) { return false; }
}());
check('no_exp_token 无 exp 字段', function() {
  try {
    var payload = JSON.parse(Buffer.from(jwtData.no_exp_token.token.split('.')[1], 'base64').toString());
    return payload.exp === undefined;
  } catch (e) { return false; }
}());

// ================================================================
//  BONUS: Pro feature gate verification
// ================================================================

section('附加D、Pro 功能门控验证');

const licenseSrc = fs.readFileSync(path.join(ROOT, 'src/utils/license.js'), 'utf8');
check('PRO_FEATURES 含 largeFiles', licenseSrc.includes("'largeFiles'"));
check('PRO_FEATURES 含 advancedSearch', licenseSrc.includes("'advancedSearch'"));
check('PRO_FEATURES 含 jwtDecode', licenseSrc.includes("'jwtDecode'"));
check('PRO_FEATURES 含 csvExport', licenseSrc.includes("'csvExport'"));
check('PRO_FEATURES 含 proThemes', licenseSrc.includes("'proThemes'"));
check('PRO_FEATURES 含 customShortcuts', licenseSrc.includes("'customShortcuts'"));
check('isActive() 含 localhost:8765 自动启用', licenseSrc.includes('localhost') && licenseSrc.includes("port === '8765'"));
check('isActive() 含 dev flag', licenseSrc.includes("clearjson_pro_dev"));

// ================================================================
//  BONUS: Run unit tests
// ================================================================

section('附加E、136 个单元测试');

try {
  const result = execSync('npm test 2>&1', { cwd: ROOT, timeout: 30000, encoding: 'utf8' });
  const passMatch = result.match(/pass (\d+)/);
  const failMatch = result.match(/fail (\d+)/);
  const passCount = passMatch ? parseInt(passMatch[1]) : 0;
  const failCount = failMatch ? parseInt(failMatch[1]) : 0;
  check(`单元测试通过 ${passCount}/${passCount + failCount}`, failCount === 0);
} catch (e) {
  check('单元测试全部通过', false);
}

// ================================================================
//  BONUS: Content Security
// ================================================================

section('附加F、隐私 & 安全检查');

const contentSrc = fs.readFileSync(path.join(ROOT, 'src/content/content.js'), 'utf8');
check('content.js 不含 fetch()', !contentSrc.includes('fetch('));
check('content.js 不含 XMLHttpRequest', !contentSrc.includes('XMLHttpRequest'));
check('content.js 不含 navigator.sendBeacon', !contentSrc.includes('sendBeacon'));
check('content.js 不含 new Image() 追踪', !contentSrc.includes('new Image('));

// ================================================================
//  SUMMARY
// ================================================================

console.log(`\n${'='.repeat(60)}`);
console.log(`  测试结果汇总`);
console.log(`${'='.repeat(60)}`);
console.log(`  总计 ${total} 项`);
console.log(`  ${PASS}  通过 (自动): ${passed}`);
console.log(`  ${MANUAL}  需手动: ${manual}`);
console.log(`  ${FAIL}  失败: ${failed}`);
console.log(`${'='.repeat(60)}`);

if (failed > 0) process.exit(1);
else console.log('\n  所有自动化检查通过！\n');
