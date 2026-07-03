# ClearJSON — 项目状态

> 最后更新：2026-07-03 | 当前版本：v0.3.0（Phase 3 完成 + 发布前修复 + 自动化测试就绪）

---

## 一、项目概述

隐私优先、开源的浏览器 JSON 查看器（Chrome 扩展）。MIT 协议。

- **仓库**：https://github.com/wayknow/clearjson
- **产品页**：https://wayknow.tech/clearjson.html
- **隐私政策**：https://wayknow.tech/clearjson-privacy.html
- **定位**：替代被卖后注入广告的 JSON Formatter（曾 200 万用户）
- **商业模式**：免费版永远免费，Pro 版 $29 终身买断，不做订阅
- **竞品格局**：5-10 个免费替代品，JSONVault Pro 是唯一付费竞品（订阅制）

---

## 二、当前完成状态

### Phase 1 ✅（基础框架）
- Chrome Extension Manifest V3，最小权限（storage + activeTab）
- 自动检测 JSON 页面（Content-Type + 内容探测 + body 分析）
- JSON 解析 + 行号/列号错误定位
- 语法高亮 tokenizer（7 种类型：key/string/number/boolean/null/punctuation/link/image）
- 可折叠树形视图 + 缩进引导线
- 点击复制值 / 右键复制 JSONPath
- 链接自动识别 / 图片 URL 检测

### Phase 2 ✅（核心功能）
- 10 种免费主题 + 20 Pro 主题（CSS 变量驱动）
- 搜索栏（子串匹配 + 计数 + ↑↓导航 + 全部高亮）
- 图片 URL 悬停弹窗预览
- 大文件 Pro 门控（>2MB 弹升级提示）
- 独立查看器（粘贴/拖拽/文件加载/设置面板/主题选择器网格）
- URL 排除列表（正则匹配）
- 导出菜单（Pro 解锁 CSV/TSV/YAML/TypeScript，免费可复制/下载 JSON）
- Pro 升级页面 + 许可证输入 + 激活/停用
- 许可证验证系统（Cloudflare Worker + D1，在线验证 + 离线降级）

### Phase 3 ✅（Pro 差异化 + 发布准备）
- **JWT 自动解码**：检测 `eyJ...` token，内联展示 Header + Payload，过期高亮
- **30 主题全部就位**：Pro 用户可循环全部主题，免费用户仅 10 个
- **自定义快捷键面板**：6 个快捷键可自定义（viewer 设置页，Pro 独享）
- **TypeScript 递归类型推断**：嵌套对象生成独立 interface，相同结构去重
- **正式测试套件**：136 个测试，5 个模块，Node 原生 test runner，零依赖
- **许可证服务器**：Cloudflare Worker + D1，与 SnapMark 共享 `api.wayknow.tech` 域名
- **发布素材**：隐私政策、商店文案、截图指南（见 `docs/`）

### 新增模块（Phase 3）
- `jwt.js` — JWT 检测、Base64Url 解码、内联渲染
- `server/` — Cloudflare Worker + D1 许可证签发与验证服务
- `tests/` — 136 个单元测试，覆盖 parser/tokenizer/jwt/license/export

**代码量：** 30 个源文件，约 7,500 行（含 CSS 900+ 行、测试 1,100+ 行）。测试基础设施新增 3 个脚本（`run-checklist.js`, `browser-test.js`, `server.js`）+ 4 个 JSON 数据集。

---

## 三、架构决策记录

### 为什么不用框架（React/Vue）
- 扩展体积敏感（Chrome Web Store 审核更严格）
- 内容脚本注入到任意页面，不能带 100KB+ 的运行时
- 虚拟树需要精细 DOM 控制，框架的 VDOM 反而碍事
- 结论：Vanilla JS + IIFE 模块模式，通过 manifest 的 `js` 数组按序加载

### 为什么不做订阅制
- 纯客户端工具，无服务器成本
- 开发者对"又一个订阅"极度反感
- $2/月收入不够养后端（用户系统、API、安全合规）
- 结论：$29 终身买断，Pro 功能全在这一个价格里

### 为什么不加 AI
- 隐私承诺矛盾（"数据绝不离开本机" vs 把 JSON 发给 OpenAI）
- API 成本不可控（单个重度用户可能烧掉 $5-10/月）
- 替代方案太方便（开发者本来就开着 ChatGPT/Claude）
- 结论：不做。这是产品的边界

### 为什么不做 JSONPath 查询
- JSON Query Tool、Rahul Baruri 版 Viewer Pro 免费做了，且做得很好
- 再做一个不如它们，没有差异化
- 结论：不做。同理砍掉了 JSON Diff（Just JSON、JsonKing 免费做了）

### 为什么不做高级编辑模式
- 没人真在浏览器里编辑 JSON。编辑场景在 VS Code/JetBrains
- 实现成本高（迷你 IDE），使用率低
- 结论：不做

### 为什么图片预览放免费版
- 实现成本极低（URL 后缀检测 + hover 弹窗）
- 竞品没人做，眼前一亮的小功能
- 免费版需要"比所有免费竞品都好用"的记忆点
- 结论：免费，作口碑功能

### 大文件虚拟滚动策略
- 不是所有免费竞品都不做，Lens 和 Fractured JSON 免费支持
- 但技术门槛真实存在：需要 Web Worker + 流式解析 + 虚拟 DOM
- ClearJSON 卖的不是"唯一"，是"最好 + 开源 + $29 终身 vs 订阅"
- 实现：Worker 构建 flat node array → 主线程虚拟树只渲染可见行

### 许可证系统设计
- 在线验证：`POST https://api.wayknow.tech/clearjson/api/license/verify`
- Cloudflare Worker + D1，与 SnapMark 共享 `api.wayknow.tech` 域名，按路径前缀分发
  - `api.wayknow.tech/snapmark/*` → snapmark-license Worker
  - `api.wayknow.tech/clearjson/*` → clearjson-license Worker
- 设备绑定：每 key 最多 3 台设备，自动激活和去重
- 7 天缓存 + 离线降级（服务器不可达时降级为本地格式校验）
- 通过 `localStorage` + `chrome.storage.local` 双层存储
- 开发模式：`localStorage.setItem('clearjson_pro_dev', '1')` 绕过所有验证
- Key 格式：`CLJ-XXXX-XXXX-XXXX`（29 个字符，不含 0/O/1/I/l 避免混淆）
- Creem 支付 webhook → 自动生成 key → 存入 D1

### 测试策略
- Node.js 内置 test runner（`node:test` + `assert`），零外部依赖
- 测试套件模拟浏览器环境：window, localStorage, chrome.storage, crypto, fetch
- 每个模块按 manifest 加载顺序引入，确保依赖关系正确
- `npm test` 一键跑全部 136 个测试

---

## 四、关键待决策事项

### 1. Chrome Web Store 开发者账号
- 需要 $5 一次性注册费
- 账号名会显示在商店页面上
- 发布前需要准备：1280×800 截图 ×5、440×280 小图、推广文案
- 文案已就绪：`docs/store-listing.md`

### 2. 定价最终确认
- 当前：$29 终身买断
- 是否在上市前做一轮价格测试？（给 10 个开发者试用，问他们愿意付多少）
- CSDN 博客、dev.to、Product Hunt 免费 vs 付费的转化数据需要持续观察

### 3. 免费竞品的后续动作
- 如果 Lens 或 Fractured JSON 把大文件支持做得更好，ClearJSON 的 Pro 需要加新功能应对
- 当前最大的风险：某个免费竞品开始认真做商业化，同时提供大文件 + 开源 + 免费

### 4. 多语言支持
- 当前全英文
- 中文市场（CSDN、知乎）是推广重地，要不要做 i18n？
- 成本不高（JSON 文件映射），但需要维护

---

## 五、已知问题 & 技术债

### 发布前已修复 ✅
1. ~~Firefox 内置 JSON viewer 冲突~~ → Firefox 暂不上架，不作为阻塞项
2. ~~`<all_urls>` vs `activeTab`~~ → 已移除 `host_permissions` 中的 `*://*/*`，仅保留 `file:///*`。内容脚本注入靠 `content_scripts.matches`，审核更友好
3. ~~主题切换闪烁~~ → `buildViewer()`/`showError()`/`showLargeFileWarning()` 在清空页面前先捕获主题背景色，清空后立即设置 `body.style.backgroundColor`
4. ~~`document_start` body null 死循环~~ → rAF 轮询加计数器上限 300 次（≈5 秒），超时后静默放弃
5. ~~`ROW_HEIGHT` 硬编码 22px~~ → `virtual-tree.js` 改为 render 时动态测量实际行高（`offsetHeight`），适配页面缩放
6. ~~andromeda 主题 typo~~ → `punctu` 改为 `punct`（`themes.js`）

### 发布前 UI 优化 ✅（2026-07-03）
7. ~~Landing 页按钮布局~~ → 单行排列：`[Format JSON] [📂 Load File…] [Try Sample] [Clear]`，Clear 右对齐
8. ~~Drop zone 大框冗余~~ → 删除虚线框，改用页面任意位置拖拽
9. ~~Toolbar 折叠按钮太小~~ → `font-size: 8px` → `11px`，高分屏可见
10. ~~粘贴不自动格式化~~ → textarea 粘贴后自动渲染
11. ~~Copy 按钮无反馈~~ → 点击后变绿 `✓ Copied`，1.5s 恢复
12. ~~Popup 版本号~~ → `v0.1.0` → `v0.3.0`
13. ~~缺少示例数据~~ → 新增 "Try Sample" 按钮，一键体验

### 技术债
**当前无技术债。**

以下曾被列为技术债，经评估后认定不是：
1. ~~Worker 内联 Blob URL~~ → MV3 content script 中创建 Worker 的常规做法，脚本仅 70 行且稳定，无改造必要
2. ~~搜索不支持正则（免费版）~~ → 产品分层策略，正则搜索是 Pro 功能，不是技术债
3. ~~Firefox 兼容~~ → 本项目为 Chrome 扩展，Firefox 兼容属于可选平台扩展方向，不是技术债

### 性能边界
- 免费版：建议 < 2MB
- Pro 虚拟树：10,000 节点渲染 < 1 秒（已验证）
- Pro Worker 超时：60 秒
- 已知极限：单行字符串过长（>100KB 不含换行）会导致虚拟树单行溢出

---

## 六、下一步（发布前）

### 阻塞发布
1. **Chrome Web Store 注册 + 截图**：描述就绪，$5 已付，等待身份审核通过
2. **至少 2 周的实机测试**：自动测试已全部通过（见 §七），仍需人工日常使用验证
3. **隐私政策**：已部署 `https://wayknow.tech/clearjson-privacy.html` ✅

### 发布前已完成的修复
4. ~~虚拟树 ROW_HEIGHT 动态测量~~ ✅
5. ~~`document_start` body null 边界处理~~ ✅
6. ~~host_permissions 优化~~ ✅
7. ~~主题首次加载闪烁~~ ✅
8. ~~andromeda 主题 typo~~ ✅

### 锦上添花
9. JSON Schema 推断（从实例 JSON 生成 JSON Schema）
10. Edge 浏览器兼容测试 + 上架（Chromium 兼容，基本零成本）
11. 国际化（中文）

---

## 七、测试基础设施

### 测试套件总览

| 套件 | 类型 | 项目数 | 命令 |
|------|------|--------|------|
| 单元测试 | Node 内置 runner | 136 | `npm test` |
| 静态分析清单 | Node 脚本 | 130 | `node test-data/run-checklist.js` |
| 浏览器自动化 | Puppeteer headless | 21 | `node test-data/browser-test.js` |

### 静态分析清单 (`test-data/run-checklist.js`)
覆盖：manifest 完整性、模块加载顺序、源文件存在、主题变量、JWT 数据、Pro 门控、隐私安全、所有 43 项测试清单。
**130 项全部通过。**

### 浏览器自动化测试 (`test-data/browser-test.js`)
在 Puppeteer headless Chrome 中注入 ClearJSON 模块，模拟 content.js 初始化，然后逐一执行工具栏交互测试。覆盖原手动测试项 #12-18（Collapse/Expand/Raw/Copy/Theme/Pro）。
**21 项全部通过。**

> 注意：点击 `.cj-value` 节点复制值的交互因 headless Chrome 对部分 inline 元素的合成点击不冒泡，改为验证节点存在 + 复制逻辑正确。真实浏览器中无此问题。

### 测试数据 (`test-data/`)
- `complex-api-response.json` — 复杂嵌套 JSON（链接、图片、深度嵌套、edge cases）
- `jwt-test.json` — JWT 测试（含有效/过期/无 exp 三种 token）
- `users-array.json` — 10 条对象数组（CSV 导出测试）
- `large-array.json` — 2.2 MB 大文件（Pro 门控测试）
- `server.js` — 本地测试服务器（`node test-data/server.js`，端口 8765）
- `TEST-CHECKLIST.md` — 43 项手工测试清单

### 本地测试服务器
```bash
node test-data/server.js
# 然后打开 http://localhost:8765/complex-api-response.json
```
在 `localhost:8765` 上 Pro 功能**自动启用**，无需手动设置 `localStorage`。

---

## 八、开发指南

### 环境准备
```bash
git clone git@github.com:wayknow/clearjson.git
cd clearjson
cd server && npm install   # 许可证服务器依赖
```

### 加载扩展（Chrome）
1. `chrome://extensions/` → 开启"开发者模式"
2. "加载已解压的扩展程序" → 选择项目目录
3. 打开任何 JSON URL（如 `https://jsonplaceholder.typicode.com/users`）自动格式化

### 测试 Pro 功能（开发模式）
```js
localStorage.setItem('clearjson_pro_dev', '1')
```

### 运行测试
```bash
npm test                    # 全部 136 个测试
npm run test:parser         # 仅 parser 模块
npm run test:tokenizer      # 仅 tokenizer 模块
npm run test:jwt            # 仅 JWT 模块
npm run test:license        # 仅 license 模块
npm run test:export         # 仅 export 模块
```
零依赖，Node 18+ 内置 test runner (`node:test`)。

### 部署许可证服务器
```bash
cd server
# 1. npx wrangler d1 create clearjson-license-db  → 填入 wrangler.toml
# 2. npm run db:init -- --remote
# 3. npx wrangler secret put ADMIN_API_KEY
# 4. npm run deploy
```
Worker 名称：`clearjson-license`，D1 数据库：`clearjson-license-db`

### 项目结构
```
clearjson/
├── manifest.json              # MV3, 最小权限
├── icons/                     # 16/48/128 PNG
├── server/                    # Cloudflare Worker + D1 许可证服务
│   ├── src/index.js           # API: verify/generate/webhook/admin
│   ├── schema.sql             # D1 表结构
│   └── wrangler.toml          # name = "clearjson-license"
├── src/
│   ├── content/               # 内容脚本（注入到 JSON 页面）
│   │   ├── content.js         # 检测 → 解析 → 渲染 → 搜索 → 快捷键
│   │   └── content.css        # 结构样式 + CSS 变量（900+ 行）
│   ├── viewer/                # 独立查看器
│   │   ├── viewer.html        # 设置/主题/许可证/快捷键面板
│   │   └── viewer.js          # 查看器逻辑
│   ├── popup/                 # 工具栏弹窗
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── utils/                 # 核心模块（按 manifest js 数组顺序加载）
│       ├── parser.js          # JSON 检测 + 解析 + 统计
│       ├── tokenizer.js       # 语法高亮分词器
│       ├── themes.js          # 10 免费 + 20 Pro 主题 CSS 变量
│       ├── license.js         # Pro 许可证（在线验证 + 离线降级）
│       ├── export.js          # CSV/TSV/YAML/TypeScript 递归推断
│       ├── jwt.js             # JWT 检测 + Base64Url 解码 + 内联渲染
│       ├── stream-parser.js   # Web Worker 流式解析器
│       ├── virtual-tree.js    # 虚拟滚动树形视图
│       └── tree.js            # 标准递归树形视图
├── tests/                     # 136 个单元测试
│   ├── helpers/setup.js       # 模拟浏览器环境
│   ├── test-parser.js         # 27 个测试
│   ├── test-tokenizer.js      # 29 个测试
│   ├── test-jwt.js            # 27 个测试
│   ├── test-license.js        # 23 个测试
│   └── test-export.js         # 30 个测试
├── docs/
│   └── store-listing.md       # Chrome Web Store 文案 + 截图指南
├── package.json               # npm test 脚本
├── features.md                # 完整功能列表
├── PRODUCT.md                 # 企划书
└── README.md                  # 公开 README
```

### 模块加载顺序（manifest 中的 js 数组）
```
parser.js → tokenizer.js → themes.js → license.js → export.js
→ jwt.js → stream-parser.js → virtual-tree.js → tree.js → content.js
```

每个模块使用 `window.ClearJSON` 命名空间：
```js
var ClearJSON = window.ClearJSON || {};
(function (C) {
  'use strict';
  // ... 模块逻辑 ...
  C.ModuleName = { publicAPI };
})(ClearJSON);
```

### 主题系统原理
- `themes.js` 定义所有 30 主题的 CSS 变量键值对
- `content.css` 定义结构样式，引用 `var(--cj-bg)` 等变量
- 运行时注入 `<style>` 标签设置 CSS 变量
- 切换主题 = 更新 style 标签 + body class
- Pro 用户循环全部 30 主题，免费用户仅 10 个

### Pro 功能门控
- 所有 Pro 功能通过 `ClearJSON.License.isActive()` 检查：
  - `largeFiles` — 大文件虚拟滚动（>2MB）
  - `advancedSearch` — 正则搜索
  - `jwtDecode` — JWT 自动解码
  - `csvExport` — CSV/TSV/YAML/TypeScript 导出
  - `proThemes` — 20 个 Pro 主题
  - `customShortcuts` — 自定义快捷键
- 验证流程：在线验证 → 7 天缓存 → 离线降级格式校验
- 开发模式：`localStorage.setItem('clearjson_pro_dev', '1')` 绕过

### JWT 解码实现要点
- 正则匹配：`/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/`
- Base64Url 解码：`-` → `+`, `_` → `/`，补齐 `=` padding
- 渲染在 `tree.js` 和 `virtual-tree.js` 的字符串值处理中
- 展开/折叠：CSS class `.cj-jwt-expanded` 控制
- 过期检测：比对 `exp` claim 与当前时间

---

## 九、研究结论摘要

### 竞品分析
| 竞品 | 优势 | 劣势 |
|------|------|------|
| JSONVault Pro | 功能最全（JWT/Schema/500MB） | 订阅制，不开源 |
| TreeJSON | 免费开源，YAML/XML/CSV | 只读，无大文件 |
| JSON Alexander | Wes Bos 出品，社区信任 | 功能基础 |
| arnav-kr | 60 免费主题 | 无 Diff/JSONPath/大文件 |
| Just JSON | 21KB 极轻量，有 Diff | 功能最少 |

### 定价研究
- 开发者工具一次性买断 sweet spot：$19-49
- $29 卡在 $30 心理线下
- CSS Scan 卖 $69 卖了 1,450+ 份（证明模式可行，但不能定太高）
- 免费 → 付费转化率通常 3-5%（dev tools 品类）
- 首年预估收入：$50K-80K（需要一次成功的 HN/PH 发布）

### 被砍掉的功能及理由
- AI 集成：隐私矛盾 + API 成本
- 云端同步：养不起后端
- JSON Diff：Just JSON、JsonKing 免费做了
- JSONPath 查询：JSON Query Tool 免费做得很好
- 高级编辑：伪需求
- 订阅制：纯客户端工具没有持续成本

---

## 十、推广计划

1. **借势**：Hacker News 旧工具背叛用户的热帖
2. **Product Hunt**：周二/周三发布
3. **GitHub 开源**：Star 数积累 → 自然流量
4. **交叉推广**：与 SnapMark 互相导流
5. **中文市场**：CSDN、知乎、V2EX

---

## 十一、资源

- GitHub：https://github.com/wayknow/clearjson
- 产品页：https://wayknow.tech/clearjson.html
- 隐私政策：https://wayknow.tech/clearjson-privacy.html
- 网站代码：`~/xiaoxiao/work/wayknow`
- Chrome Web Store：待发布
- 许可证：MIT
- 许可证服务器 API：`https://api.wayknow.tech/clearjson/`
