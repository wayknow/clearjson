# ClearJSON — 项目状态

> 最后更新：2026-07-02 | 当前版本：v0.2.0（许可证系统接入 Creem，在线验证）

---

## 一、项目概述

隐私优先、开源的浏览器 JSON 查看器（Chrome 扩展）。MIT 协议。

- **仓库**：https://github.com/wayknow/clearjson
- **定位**：替代被卖后注入广告的 JSON Formatter（曾 200 万用户）
- **商业模式**：免费版永远免费，Pro 版 $29 终身买断，不做订阅
- **竞品格局**：5-10 个免费替代品，JSONVault Pro 是唯一付费竞品（订阅制）

---

## 二、当前完成状态

### Phase 1 ✅（基础框架，done）
- Chrome Extension Manifest V3，最小权限（storage + activeTab）
- 自动检测 JSON 页面（Content-Type + 内容探测 + body 分析）
- JSON 解析 + 行号/列号错误定位
- 语法高亮 tokenizer（7 种类型：key/string/number/boolean/null/punctuation/link/image）
- 可折叠树形视图 + 缩进引导线
- 点击复制值 / 右键复制 JSONPath
- 链接自动识别 / 图片 URL 检测

### Phase 2 ✅（当前版本，done）

**新增模块：**
- `themes.js` — 10 免费主题 + 20 Pro 主题（CSS 变量驱动）
- `license.js` — 本地许可证校验（HMAC 风格 checksum，无需服务端）
- `export.js` — CSV/TSV/YAML/TypeScript 类型导出
- `stream-parser.js` — Web Worker 大文件流式解析器
- `virtual-tree.js` — 虚拟滚动树视图（仅渲染可见 50-100 行）

**新增功能：**
- 搜索栏（子串匹配 + 计数 + ↑↓导航 + 全部高亮）
- 10 种主题循环切换（dark/light/sepia/monokai/dracula/nord/onedark/solarized-light/github/high-contrast）
- 图片 URL 悬停弹窗预览
- 大文件 Pro 门控（>2MB 弹升级提示）
- 独立查看器（粘贴/拖拽/文件加载/设置面板/主题选择器网格）
- URL 排除列表（正则匹配）
- 导出菜单（Pro 解锁 CSV/TS/YAML，免费可复制/下载 JSON）
- Pro 升级页面 + 许可证输入 + 激活/停用

**代码量：** 24 个文件，5,325 行（含 CSS 729 行）

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
- 设备绑定：每 key 最多 3 台设备，自动激活和去重
- 7 天缓存 + 离线降级（服务器不可达时降级为本地格式校验）
- 通过 `localStorage` + `chrome.storage.local` 双层存储
- 开发模式：`localStorage.setItem('clearjson_pro_dev', '1')` 绕过所有验证
- Key 格式：`CLJ-XXXX-XXXX-XXXX`（29 个字符，不含 0/O/1/I/l 避免混淆）
- Creem 支付 webhook → 自动生成 key → 存入 D1

---

## 四、关键待决策事项

### 1. Chrome Web Store 开发者账号
- 需要 $5 一次性注册费
- 账号名会显示在商店页面上
- 发布前需要准备：1280×800 截图、440×280 小图、推广文案

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

### 需要修复的
1. **Firefox 内置 JSON viewer 冲突**：Firefox 有原生 JSON 查看器，扩展需要额外配置才能在 Firefox 上工作
2. **`<all_urls>` vs `activeTab`**：当前 manifest 用了 `*://*/*` 的 host_permissions，Chrome Web Store 审核可能需要更长时间。考虑改为 `activeTab` + 用户手动触发
3. **主题切换在 content script 场景**：如果用户在新标签页打开 JSON URL，主题会重置为默认（因为 settings 异步加载）。已通过 `loadSettings` 处理，但首次加载有闪烁

### 技术债
1. **Worker 脚本是内联 Blob URL**：符合 CSP 但不够优雅，长期考虑独立 worker 文件
3. **虚拟树的 ROW_HEIGHT 硬编码为 22px**：如果用户缩放页面会错位。需要改为动态测量
4. **搜索不支持正则（免费版）**：代码留了接口，但正则按钮仅 Pro 可见
5. **没有单元测试文件**：测试是通过 bash heredoc 临时跑的，需要建正式的 `tests/` 目录
6. **内容脚本在 `document_start` 时 `document.body` 为 null**：通过 `requestAnimationFrame` 轮询，这在极慢连接下可能失败

### 性能边界
- 免费版：建议 < 2MB
- Pro 虚拟树：10,000 节点渲染 < 1 秒（已验证）
- Pro Worker 超时：60 秒
- 已知极限：单行字符串过长（>100KB 不含换行）会导致虚拟树单行溢出

---

## 六、下一步（Phase 3 / 发布前）

### 必须完成（阻塞发布）
1. **Chrome Web Store 商店页面准备**：截图、描述、关键词、分类
2. **至少 2 周的实机测试**：在日常使用中发现 bug
3. **隐私政策页面**：GitHub Pages 或扩展内置页

### 应该完成（提升转化）
5. **JWT 自动解码**（Pro）：检测 `eyJ...` token，内联展示 header+payload
6. **30 种主题全部就位**：当前 10 免费可用，20 个 Pro 主题 CSS 已定义但仅 Pro 解锁
7. **自定义快捷键设置面板**
8. **TypeScript 类型导出优化**：当前只推断顶层，需递归推断嵌套

### 锦上添花
9. **JSON Schema 推断**：从实例 JSON 生成 JSON Schema
10. **Edge 浏览器兼容测试 + 上架**：Chromium 兼容，基本零成本
11. **国际化（中文）**
12. **正式测试套件**：将 Node.js 测试改为 mocha/jest 运行

---

## 七、开发指南

### 环境准备
```bash
git clone git@github.com:wayknow/clearjson.git
cd clearjson
```

### 加载扩展（Chrome）
1. `chrome://extensions/` → 开启"开发者模式"
2. "加载已解压的扩展程序" → 选择项目目录
3. 打开任何 JSON URL（如 `https://jsonplaceholder.typicode.com/users`）自动格式化

### 测试 Pro 功能（开发模式）
在查看器 console 里执行：
```js
// 方法 1：设置开发标志
localStorage.setItem('clearjson_pro_dev', '1')

// 方法 2：生成有效许可证
var key = ClearJSON.License.generateDevKey()
ClearJSON.License.storeLicense(key)
// 复制 key 到升级页面输入框激活
```

### 运行测试
```bash
node << 'NODEEOF'
// 测试脚本在 conversation history 里，需要提取到 tests/ 目录
// TODO: 创建正式测试套件
NODEEOF
```

### 项目结构
```
clearjson/
├── manifest.json              # MV3, 最小权限
├── icons/                     # 16/48/128 PNG
├── server/                    # Cloudflare Worker + D1 许可证服务
│   ├── src/index.js           # API: verify/generate/webhook/admin
│   ├── schema.sql             # D1 表结构
│   ├── wrangler.toml          # name = "clearjson-license"
│   └── README.md              # 部署文档
├── src/
│   ├── content/               # 内容脚本（注入到 JSON 页面的核心逻辑）
│   │   ├── content.js         # 检测 → 解析 → 渲染 → 搜索 → 快捷键
│   │   └── content.css        # 结构样式 + CSS 变量引用（729行）
│   ├── viewer/                # 独立查看器（粘贴/拖拽/文件/设置/Pro 页面）
│   │   ├── viewer.html
│   │   └── viewer.js
│   ├── popup/                 # 工具栏弹窗
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── utils/                 # 核心模块（按 manifest js 数组顺序加载）
│       ├── parser.js          # JSON 检测 + 解析 + 统计
│       ├── tokenizer.js       # 语法高亮分词器
│       ├── themes.js          # 30 主题 CSS 变量定义
│       ├── license.js         # Pro 许可证系统（在线验证 + 离线降级）
│       ├── export.js          # CSV/TSV/YAML/TypeScript 导出
│       ├── stream-parser.js   # Web Worker 大文件解析器
│       ├── virtual-tree.js    # 虚拟滚动树形视图
│       └── tree.js            # 标准递归树形视图
├── features.md                # 完整功能列表
├── PRODUCT.md                 # 企划书
└── README.md                  # 公开的 README
```

### 模块加载顺序（manifest 中的 js 数组）
```
parser.js → tokenizer.js → themes.js → license.js → export.js
→ stream-parser.js → virtual-tree.js → tree.js → content.js
```

每个模块通过 `var ClearJSON = window.ClearJSON || {}; (function(C){ ... })(ClearJSON);` 模式注册，前面的模块暴露的 API 供后面的模块使用。

### 主题系统原理
- `themes.js` 定义所有主题的 CSS 变量键值对
- `content.css` 定义结构样式，引用 `var(--cj-bg)` 等变量
- 运行时通过注入 `<style>` 标签设置 `:root { ... }` 变量
- 切换主题 = 更新 style 标签内容 + 更新 body class

### Pro 功能门控
- 所有 Pro 功能通过 `ClearJSON.License.isActive()` 检查
- 验证流程：在线验证 → 7 天缓存 → 离线降级格式校验
- 许可证存储在 `localStorage`（主） + `chrome.storage.local`（备）
- 开发模式可设置 `localStorage.setItem('clearjson_pro_dev', '1')` 绕过

---

## 八、研究结论摘要

### 竞品分析（10 个活跃竞品）
| 竞品 | 优势 | 劣势 |
|------|------|------|
| JSONVault Pro | 功能最全（JWT/Schema/500MB） | 订阅制，不开源 |
| TreeJSON | 免费开源，YAML/XML/CSV | 只读，无大文件 |
| JSON Alexander | Wes Bos 出品，社区信任 | 功能基础 |
| arnav-kr | 60 免费主题 | 无 Diff/JSONPath/大文件 |
| Just JSON | 21KB 极轻量，有 Diff | 功能最少 |

### 定价研究
- 开发者工具一次性买断的 sweet spot：$19-49
- $29 是卡在 $30 心理线下的最佳位置
- CSS Scan 卖 $69 卖了 1450+ 份（证明模式可行，但 ClearJSON 有免费替代品，不能定太高）
- 免费 → 付费转化率通常在 3-5%（dev tools 品类）
- 首年预估收入：$50K-80K（保守估计，需要一次成功的 HN/PH 发布）

### 大文件需求验证
- 真实需求 ✅（Chrome 10MB 以上 JSON 会卡死）
- 但不是独占能力（Lens、Fractured JSON 免费支持）
- 卖点是"最好 + 开源 + $29 终身 vs JSONVault Pro 的订阅"

### 被砍掉的功能及理由
- AI 集成：隐私矛盾 + API 成本
- 云端同步：养不起后端
- JSON Diff：Just JSON、JsonKing 免费做了
- JSONPath 查询：JSON Query Tool 免费做得很好
- 高级编辑：伪需求
- 订阅制：纯客户端工具没有持续成本

---

## 九、推广计划要点

1. **借势**：Hacker News 旧工具背叛用户的热帖 → "I rebuilt JSON Formatter after the original went rogue"
2. **Product Hunt**：周二/周三发布，开发者工具在 PH 历史表现好
3. **GitHub 开源**：Star 数积累 → 自然流量 + 贡献者
4. **交叉推广**：与 SnapMark 互相导流（同一目标用户群）
5. **中文市场**：CSDN、知乎、V2EX

---

## 十、联系人/资源

- GitHub：https://github.com/wayknow/clearjson
- Chrome Web Store：待发布
- 许可证：MIT
- 相关竞品：JSONVault Pro（jsonvaultpro.com）、TreeJSON（Chrome 商店）、JSON Alexander（wesbos.com）
