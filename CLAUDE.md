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

## 工作约定

- 代码改动后更新 STATUS.md 同步状态
- 提交前跑 `npm test`
- 上下文快满时说"做检查点"：更新 STATUS.md → git commit → 提示清空重启
