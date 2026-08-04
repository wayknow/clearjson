# ClearJSON — 项目状态

> 最后更新：2026-08-04 | 当前版本：v1.1.4（待提交 CWS + Edge）| CWS ✅ | Edge ✅ | Glama score A/A/B ✅ | Product Hunt 已发布

---

## 一、项目概述

隐私优先的浏览器 JSON 查看器（Chrome 扩展）。

- 仓库：https://github.com/wayknow/clearjson
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

### Phase 4 ✅（免费版 CWS 上架准备）
- **Pro UI 入口隐藏**：popup Dev Mode、content Pro 按钮、viewer Pro 页面/许可证输入全部隐藏
- **大文件警告脱敏**：移除 "Upgrade to Pro" 按钮，改为 "Learn More" 链接到产品页
- **导出菜单精简**：仅显示免费选项（Copy JSON / Download JSON）
- **主题网格**：仅显示 10 个免费主题
- **版本号**：`manifest.json` + `package.json` → v1.0.0
- **截图素材**：5 张 1280×800 截图（`screenshots/`）+ 3 张宣传图（`promo/`）
- **生成脚本**：`test-data/capture-screenshots.js`（Chrome headless）

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
- ClearJSON 卖的不是"唯一"，是"最好 + $29 终身 vs 订阅"
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
- 当前最大的风险：某个免费竞品开始认真做商业化，同时提供大文件 + 免费

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
14. ~~Pro 解锁方式繁琐~~ → 三种方式：popup Dev Mode 开关（最简单）、URL `?dev` 参数、`localhost:8765` 自动启用

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

## 六、下一步

### 免费版发布（v1.0.0）
1. ~~**Chrome Web Store 注册**：$5 已付~~ ✅ 开发者身份已审核通过
2. **截图 + 宣传图**：已就绪（`screenshots/` + `promo/`）
3. ~~**打包 zip**：`clearjson-v1.0.0.zip`（55 KB）~~ ✅
4. ~~**隐私政策**：已部署 `https://wayknow.tech/clearjson-privacy.html`~~ ✅
5. ~~**Pro UI 入口已隐藏**~~ ✅
6. ~~**CWS 提交**~~ ✅ 2026-07-07 已提交审核
7. ~~**审核中**~~ ✅ 已通过并上架
8. **CWS 链接**：https://chromewebstore.google.com/detail/clearjson/bgcicghmdpefapfdeghgealacphkgobk
9. ~~**产品页更新**~~ ✅ `wayknow.tech/clearjson.html` 已更新 CWS 链接、移除 open source 声明

### v1.0.0 发布完成 ✅
- CWS 链接：https://chromewebstore.google.com/detail/clearjson/bgcicghmdpefapfdeghgealacphkgobk
- 产品页已同步更新（`wayknow.tech/clearjson.html`）

### Pro 版开发（v1.1.0+）
1. ~~**许可证服务器升级**~~ ✅ — 部署到 Cloudflare Workers，Resend 邮件已验证
2. ~~**Creem 产品**~~ ✅ — ClearJSON Pro $29，`prod_5Aha8NpKKi8AUd2sLaPRgM`
3. ~~**Worker 密钥**~~ ✅ — RESEND_API_KEY、CREEM_WEBHOOK_SECRET 已配置
4. ~~**扩展端**~~ ✅ — 恢复 Pro UI 入口（Pro 页/许可证输入/Pro 主题网格/导出/正则搜索/快捷键/大文件升级）+ Pro 页新增 **Buy Now — $29** 按钮硬编码 Creem 结账链接 `https://www.creem.io/payment/prod_5Aha8NpKKi8AUd2sLaPRgM`
5. ~~**产品页**~~ ✅ — `clearjson.html` 已更新 "Buy Now — $29" 直链 Creem 结账

#### 扩展端恢复要点（2026-07-11）
- 恢复原则：反向还原 Phase 4 隐藏提交 `5a76d32`（原始代码在父提交 `5a76d32^`），仅 5 个 UI 文件受影响；`themes.js/export.js/license.js` 与全部 CSS 完好未动。
- **安全加固**：删除 `license.js` `isActive()` 里的 `?dev` URL 白嫖后门（打开 `viewer.html?dev` 即解锁 Pro），并顺带修掉旧 `indexOf('dev')` 的误判（`?foo=devices` 等含 "dev" 子串的普通 URL 会误解锁）。保留 `localhost:8765` + 手动 `localStorage['clearjson_pro_dev']='1'` 两条本地开发绕过。
- **后门保持隐藏**：popup 的 `Dev Mode (unlock Pro)` 勾选框、打开 viewer 自动追加 `?dev` —— 均按决策不恢复。
- **license key 占位符**：旧格式 `CLEARJSON-XXXX-XXXX-XXXX`(30) → 新格式 `CLJ-XXXX-XXXX-XXXX`(maxlength 17)，对齐 `license.js` KEY_REGEX。
- **版本号**：manifest/package/popup 显示/viewer sample → v1.1.0。
- **验证**：`npm test` 136 全绿；`run-checklist.js` 130/0（顺手修了一处 `版本号 === '0.3.0'` 的陈旧断言 → 改为 semver `>=` 比较）；Puppeteer 21 项交互全绿；额外 headless 端到端验证 viewer Pro 页（Pro 页渲染 / Buy→Creem / 激活→"Pro is active" / 停用回退 / 零 JS 错误）+ dev 后门行为（`?dev` 已失效、localhost/localStorage 仍有效）。
- **webhook 测试工具**：`server/test-webhook.js` — 用 `CREEM_WEBHOOK_SECRET` 自算 HMAC 签名 POST `/api/webhook/creem`，免支付/免测试卡验证"生成 key + Resend 发信"服务端逻辑（签名与服务端 WebCrypto 逐字节自证一致）。
- **CWS 打包**：`clearjson-v1.1.0.zip`（28 文件，与 v1.0.0 同文件集，含更新后的 Pro 代码；`.gitignore` 忽略，不入库）。已包内自检：版本 1.1.0、Creem 按钮在、无 `?dev` 后门、无 server/tests/test-data。**2026-07-11 已提交 CWS 审核**。
- **商店文案**：`docs/store-listing.md` 已对齐 v1.1.0 — 加"如何升级"步骤、修正支付方式（Creem 外部支付，CWS 自家支付 2021 已停用）。提交前修正：删掉了不存在的 "fuzzy match" 声称，改为 "match highlighting"。

#### 端到端验证已通过（2026-07-11，Creem 测试模式，未花真钱）
- **完整闭环跑通**：Creem 测试付款（测试卡 4242）→ `checkout.completed` webhook → Worker 生成 `CLJ-WJYP-BN38-WPYN` → 存 D1 → Resend 发信 → 扩展粘贴激活 → **Pro 解锁**。
- **服务端改动**：`verifyCreemSignature()` 支持双密钥（`CREEM_WEBHOOK_SECRET` 生产 + `CREEM_WEBHOOK_SECRET_TEST` 测试），使测试模式 webhook 与生产并存、无需切密钥。**已部署**（Worker 版本 89acffcc），测试密钥已设入 Worker secret。
- **修复的 bug**：license 输入框 `maxlength` 之前误设 17，会截断 18 位的 `CLJ-XXXX-XXXX-XXXX` → 改为 24。
- **发现的坑（需在 Creem 后台处理）**：Creem 产品开了"原生 License keys"，导致每个买家收到**两个 key**（Creem 收据里的 `L0ZH8-...` 5×5 格式 + 我们 Resend 的 `CLJ-...`），极易贴错。**需去 Creem 后台关闭产品的原生 license 功能**（测试 + 生产 `prod_5Aha8...` 都关），只保留我们的 `CLJ-...` 体系。
- **开源残留清理**：`popup.html`（tagline "Open source" → "100% local"，页脚错误 URL `clearjson/clearjson` + "(MIT)" → `wayknow.tech`）、`package.json` description 去 "open-source"。竞品描述（README:155 指原 JSON Formatter）、内部企划（PRODUCT.md）、测试 mock 数据保留。

#### v1.1.0 收尾待办
1. ~~测激活链路~~ ✅ 端到端验证通过（见上）
2. ~~**测试产品**关闭原生 License keys~~ ✅ 测试产品已删。~~**生产产品 `prod_5Aha8...` 上线前仍需确认/关闭**~~ ✅ 生产产品原生 License keys 已关闭。
3. ~~**push + 部署 wayknow**~~ ✅ 已部署（含退款政策移除、产品页 Creem 链接）
4. ~~**提交 CWS v1.1.0**~~ ✅ 2026-07-11 提交，2026-07-13 审核通过。包内自检通过：版本 1.1.0、Creem 按钮在、无 `?dev` 后门。商店描述修正：去掉了不存在的 "fuzzy match"。
5. ~~**确认 `manifest.homepage_url`**~~ ✅ 已改为产品页 `wayknow.tech/clearjson.html`，CWS 已更新
6. ~~上线可选：真购买 $29 + 退款，验线上按钮全链路~~ ✅ 测试环境已验证完整闭环（Creem 测试卡 → webhook → Resend 发信），无需真买

### v1.1.1 修复（2026-07-23）
- **大文件处理修复**：content.js 和 viewer.js 在 >2MB + Pro 时接入 `StreamParser.parseLarge()` + `VirtualTree`。此前只做了 Pro 门控，实际渲染仍用普通树，大文件照样卡死。工具栏（展开/折叠/Raw/复制/快捷键）全部兼容两种树
- **图标修复**：icon.svg 改为与 PNG 一致的设计（两条蓝色竖线，深色渐变背景，去除不存在的彩色圆点）；新增 icon240.png 用于 Product Hunt
- **退款政策移除**：ClearJSON 和 SnapMark 的 14 天退款政策页面及所有引用已下掉，与竞品对齐
- **CWS 商店描述**：去掉了不存在的 "fuzzy match"，改为 "match highlighting"
- **首页 logo**：wayknow 网站 `/assets/clearjson-logo.svg` + `.png` 与扩展图标统一
- `clearjson-v1.1.1.zip` 已提交 CWS 审核，2026-07-25 审核通过 ✅

### v1.1.2 修复与 UI 规范化（2026-07-29）
- **content script 误判修复**：`detectJSON()` 在 Content-Type 非 JSON 时，`<pre>` 内容需占页面正文 ≥80% 才触发格式化，避免 GitHub README 等含 JSON 代码块的普通网页被误接管
- **Promo 图片修复**：3 张 promo tile 的 `{}` 旧 logo 替换为当前两条蓝色竖线设计
- **UI 设计系统规范化**：
  - **无障碍**：所有交互元素添加 `:focus-visible` 焦点指示器（2px outline），图标按钮添加 `aria-label`
  - **对比度**：popup 中 `#585b70` → `#8a8da0`，使版本号/section 标题/footer 链接满足 WCAG AA 4.5:1
  - **动画**：添加 `prefers-reduced-motion` 媒体查询，toast/button/link 动画 ≤200ms，仅操作 `transform` + `opacity`
  - **样式管理**：移除 viewer.html 全部内联 `style` 属性，提取 `<style>` 块到 `viewer.css`；JS 中 `element.style.*` 全部改为 CSS 类操作
  - **组件规范**：按钮添加 `:active` 态、`border-radius` 统一 6px、间距对齐 4px 基数系统、移除 `!important`
  - **Toast**：新增 CSS slide-up 进入动画，transition 0.3s → 0.2s
  - **新增文件**：`src/viewer/viewer.css`
- **CWS 审核**：2026-07-29 提交，2026-07-30 审核通过 ✅
- **Edge 审核**：2026-07-24 提交，2026-07-30 审核通过 ✅

### 分发 & 推广推进（2026-07-24）
- **GitHub repo 公开**：设 public，开源 MIT，方便 MCP 目录收录和社区协作
- **README**：新增 badge（npm/CWS/license）+ npm/mcp.so 链接
- **产品页**：`clearjson.html` 新增 MCP Server 区块（10 工具 + npx 一键安装）
- **MCP 目录**：mcp.so ✅ | Glama 已收录 ✅（build 成功，v0.1.0 发布，score B）| awesome-mcp-servers PR 已加 badge，等 merge
- **Edge Add-ons**：已提交审核 ✅（Store ID: 0RDCKFRQ308M）
- **Dockerfile**：根目录 + clearjson-mcp/ 各一个，用于 Glama 安全检查

### Product Hunt
- 7/14 发布，5 comments 已回复
- 28 展示 → 15 安装（53% 转化），全部来自美国（PH 流量）

### MCP 服务器 ✅（2026-07-24）
- **clearjson-mcp** — 本地 MCP server，10 个工具（含 3 个许可证管理）
  - 免费：`format_json` / `minify_json` / `validate_json` / `search_json`
  - Pro（需 license）：`query_json` / `diff_json` / `convert_json`
  - 许可证：`activate_license` / `license_status` / `deactivate_license`
  - 与 Chrome 扩展共享同一套许可证体系（CLJ-XXXX-XXXX-XXXX + 同一验证 API）
- JSONPath 查询（`$..book[?(@.price > 50)]`）和深度比对（added/removed/changed）
- 核心逻辑从 `src/utils/` 抽取为纯函数 Node.js 包（parser + exporter）
- 唯一差异化：大文件不崩（竞品全量 `JSON.parse`，大文件必崩）
- 零后端，纯本地运行。用户接入：`npx -y clearjson-mcp`
- 49 个单元测试全过
- ~~待发布 npm~~ ✅ `v1.1.0` 已发布（含 Pro 许可证系统）：[npmjs.com/package/clearjson-mcp](https://www.npmjs.com/package/clearjson-mcp)
- MCP 目录注册：mcp.so ✅ | awesome-mcp-servers PR 已提 ✅ | smithery.ai（不支持 stdio）
- 产品页（clearjson.html）已加 MCP Server 区块 ✅
- Edge Add-ons 已提交审核 ✅（Store ID: 0RDCKFRQ308M）
- 下一步：CWS 关键词优化 + Hacker News + 中文社区推广

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

### 测试 Pro 功能（三种方式，任选其一）

1. **Popup 开关**（最简单）：点扩展图标 → 勾选 `Dev Mode (unlock Pro)`
2. **URL 参数**：`viewer.html?dev`，或通过 popup 按钮打开（已自带 `?dev`）
3. **控制台**：`localStorage.setItem('clearjson_pro_dev', '1')`

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
│   │   ├── viewer.css         # 查看器独立样式
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
├── screenshots/               # CWS 5 张截图（1280×800 PNG）
├── promo/                     # CWS 宣传图（small/large/marquee tile）
├── test-data/
│   ├── capture-screenshots.js # 截图生成脚本（Chrome headless）
│   └── ...                    # JSON 测试数据 + 浏览器测试
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
| JSONVault Pro | 功能最全（JWT/Schema/500MB） | 订阅制 |
| JSON Pretty Pro | Time Machine、Table View、color chips | 免费不可持续，无大文件，无 MCP |
| TreeJSON | 免费，YAML/XML/CSV | 只读，无大文件 |
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
3. **GitHub**：Star 数积累 → 自然流量
4. **交叉推广**：与 SnapMark 互相导流
5. **中文市场**：CSDN、知乎、V2EX

---

## 十一、变更记录

### v1.1.3 → v1.1.4（2026-08-04）— 工具栏按钮优化

**改动原因：** 工具栏按钮整体偏小、Settings 按钮只有 ⚙ 图标用户不知道功能，与竞品相比按钮尺寸和可读性不足。

**具体改动：**

1. **按钮尺寸增大** — `.cj-tb-btn` padding `4px 12px` → `6px 14px`，font-size `12px` → `13px`
2. **Settings 按钮文字化** — `⚙` 图标 → `Settings` 文字标签，与其他按钮保持一致
3. **搜索导航按钮增大** — ▲▼ 按钮 font-size `8px` → `11px`，padding `2px 6px` → `4px 8px`
4. **工具栏 padding 增加** — `6px 12px` → `8px 16px`，整体更有呼吸感

**改动文件：** `src/content/content.css`、`src/viewer/viewer.html`

### v1.1.2 → v1.1.3（2026-08-04）— Pro 可见性优化

**改动原因：** 43 安装 / 0 付费。按 1-3% freemium 转化率，100 安装才预期 1-3 个付费，0 是统计学正常的。但更深层的问题：Pro 功能（大文件虚拟滚动、CSV/TSV/YAML 导出、JWT 解码）是"深度需求"，99% 免费用户一辈子不会遇到。用户不知道 Pro 有什么，就不会升级。

**决策：** 不压缩免费版（违背品牌承诺），改为让 Pro 功能在 UI 中**展示但锁定**，免费用户每天看到就知道 Pro 的存在。

**具体改动：**

1. **导出菜单** — 免费用户看到 4 个 Pro 格式分别列出（CSV → Download、TSV → Download、YAML → Download、TypeScript Types → Download），灰色 + `PRO` 角标，点击跳 Pro 购买页。原来是一行 `CSV / TS / YAML → (Pro)` 打包隐藏
2. **工具栏** — 非 Pro 用户在工具栏右侧看到 `PRO ↑` 按钮，直达 Creem 购买页（$29）。激活 Pro 后自动隐藏
3. **快捷键预览** — 不做完全隐藏，改为显示锁定预览：默认快捷键列表 + "Custom keyboard shortcuts are a Pro feature" + Upgrade 按钮
4. **浏览器返回按钮** — Settings/Pro 页面现在支持浏览器 ← 返回，通过 `hashchange` 事件同步页面状态

**改动文件：** `src/viewer/viewer.html`、`src/viewer/viewer.js`、`src/viewer/viewer.css`、`src/content/content.css`
**CSS 合规：** 移除 5 处 `!important`，复用 content.css 现有 `.cj-tb-pro` 样式，修复硬编码颜色（`var(--cj-bg)`）和间距（4px 网格）

---

## 十二、资源

- GitHub：https://github.com/wayknow/clearjson
- 产品页：https://wayknow.tech/clearjson.html
- 隐私政策：https://wayknow.tech/clearjson-privacy.html
- 网站代码：`~/xiaoxiao/work/wayknow`
- Chrome Web Store：待发布
- 许可证服务器 API：`https://api.wayknow.tech/clearjson/`
