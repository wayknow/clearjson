# ClearJSON — 隐私优先的浏览器 JSON 查看器

> Chrome 扩展（MV3）。v1.0.0 免费版已上架 Chrome Web Store。

## 项目概览

- **技术栈**：Vanilla JS + IIFE 模块模式，零框架依赖，CSS 变量驱动主题
- **测试**：`npm test`（136 个单元测试，Node 原生 test runner，零外部依赖）
- **当前状态**：无技术债，所有核心 + Pro 功能已实现
- **MCP Server**：`clearjson-mcp/` — 7 个 JSON 工具 + 3 个许可证管理工具，已发布 npm v1.1.0（`npx -y clearjson-mcp`）
- **详细状态**：[STATUS.md](STATUS.md)
- **功能列表**：[features.md](features.md)
- **Agent-First 路线**：[AGENT_FIRST.md](AGENT_FIRST.md)

## 关键架构

- 模块通过 manifest.json 的 `js` 数组按序加载，挂载到 `window.ClearJSON` 命名空间
- 加载顺序：`parser.js → tokenizer.js → themes.js → license.js → export.js → jwt.js → stream-parser.js → virtual-tree.js → tree.js → content.js`
- Pro 功能门控：`ClearJSON.License.isActive()`
- 开发模式绕过 Pro：`localStorage.setItem('clearjson_pro_dev', '1')`
- 本地测试服务器：`node test-data/server.js`（端口 8765，自动启用 Pro）
- 许可证服务器：Cloudflare Worker + D1，域名 `api.wayknow.tech/clearjson/`
- 竞品定位：替代被卖后注入广告的 JSON Formatter，$29 终身买断
- 不做：AI、订阅制、JSON Diff、JSONPath 查询、高级编辑、云端同步、用户账号

## 设计系统

**所有 UI 相关任务必须遵循以下规范。**

### Chrome 扩展约束
- 技术栈：Vanilla HTML/CSS/JS，零框架，零构建步骤
- 样式：全部写在 `.css` 文件，禁止内联 `style` 属性
- Popup 窗口：最大宽度 400px，紧凑布局，无滚动条溢出
- 图标：内联 SVG 或 PNG，禁止外部字体/图标库（CSP 限制）
- 字体栈：`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- 颜色：暗色主题为主，CSS 变量定义，支持通过 `prefers-color-scheme` 响应
- 禁止：外部 CSS/JS CDN、Google Fonts、第三方 UI 库

### 视觉规范
- 间距：4px 基数系统（4, 8, 12, 16, 24, 32）
- 圆角：按钮/输入框 6px，卡片 12px，模态框 16px
- 阴影：仅用于模态和浮动元素，`0 4px 12px rgba(0,0,0,0.3)`
- 边框：1px `rgba(255,255,255,0.08)` 分隔线
- 主色调：#3B82F6（操作按钮）、#10B981（成功）、#EF4444（危险）
- 背景层级：`#0F0F0F`（底层）→ `#1A1A1A`（卡片）→ `#242424`（悬浮）

### 动画与微交互
- 仅 CSS transition，禁止 JS 动画库
- 时长 ≤ 200ms，使用 `ease-out` 或 `cubic-bezier(0.4, 0, 0.2, 1)`
- 仅操作 `transform` 和 `opacity`，避免触发布局重排
- 按钮 hover：`opacity 0.8 → 1.0`，或 `translateY(-1px)`
- 加载状态：CSS 脉冲动画，禁止 GIF/视频
- 尊重 `prefers-reduced-motion`

### 组件规范
- 按钮：明确 hover/active/focus-visible 状态，focus 用 2px outline
- 输入框：可见标签 + 错误状态，placeholder 颜色 `#6B7280`
- 卡片：一致的内边距（16px），无突兀阴影
- 图标按钮：24×24pt，aria-label 必须
- Toast 通知：底部居中，自动消失（3s），CSS slide-up 进入

### 无障碍
- 所有交互元素可键盘导航（Tab 顺序合理）
- 图标按钮必须有 `aria-label`
- 颜色对比度 ≥ 4.5:1（暗色主题下特别注意）
- 表单错误：文字说明 + 红色边框，不仅靠颜色区分
- 焦点指示器：清晰可见，不依赖 hover

## 工作约定

- 代码改动后更新 STATUS.md 同步状态
- 提交前跑 `npm test`
- 上下文快满时说"做检查点"：更新 STATUS.md → git commit → 提示清空重启
