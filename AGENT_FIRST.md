# ClearJSON Agent-First 路线

> 给 ClearJSON 加一条 agent 可调用的通道。同一个功能、同一个核心、两个入口——人通过 UI，agent 通过 CLI/MCP。
> 最后更新：2026-07-24 | 已实现：v1.1.0 npm 发布

---

## 一、为什么做

Agent 产出的 JSON 量远超人类。Claude Code 每次 tool call 返回 JSON，批量脚本输出 JSON，日志是 JSON。当 agent 需要格式化、验证、搜索自己产出的 JSON 时，只能写正则或用 bash `jq`。

ClearJSON 如果有个 MCP server，agent 可以直接调用——不需要人类中转。

**这不是新增产品，而是给现有产品加一个程序入口。**

---

## 二、竞品现状

JSON MCP server 不是空白市场，已经有人了：

| MCP Server | 工具数 | 核心功能 | 发布日期 |
|------|:--:|------|------|
| **jsonfmt-mcp** | 21 | 格式化/压缩/验证/修复/diff/转换/JWT/Schema/安全扫描 | 2026-03 |
| **json-forge-mcp** | 7 | 格式化/验证/diff/转换/JSONPath | 2026-02 |
| json-toolkit-mcp | 5 | 格式化/压缩/验证/TS 接口/合并 | - |
| json-mcp | 3 | JSONPath/jq 风格查询 | 2025-11 |

### 他们的致命缺陷

**没有人做大文件。** 所有竞品都直接 `JSON.parse()` 全量加载。100MB JSON → 崩。500MB JSON → 崩。

这是 ClearJSON MCP 的唯一差异化：**任意大小的 JSON，打开不崩、格式化不崩、搜索不崩。**

---

## 三、ClearJSON 的大文件处理

v1.1.1 已修复并接入生产路径。两层优化：

**Web Worker 解析**（`src/utils/stream-parser.js`）：
- `JSON.parse()` 移到 Worker 线程，避免主线程卡死
- 60 秒超时保护
- 输出扁平化的 node 数组供虚拟滚动消费

**虚拟滚动**（`src/utils/virtual-tree.js`）：
- 只渲染 viewport + 20 行缓冲
- 动态行高测量，自适应缩放/字体
- 折叠/展开通过过滤扁平视角的子节点实现

### 为什么不叫"流式解析"

当前的 Worker 方案仍调用 `JSON.parse(text)` 全量加载，不是真正的增量 tokenizer。但在实践中已经做到了"100MB 不崩"——因为解析在 Worker 里、DOM 只渲染可见行。真正的增量解析是未来优化方向，当前方案满足 MCP 场景需求。

---

## 四、MCP 定位

**不做"21 个工具的瑞士军刀"**——打不过 jsonfmt-mcp。

**只做一件事：大文件不崩。** Agent 处理 JSON 日志、批量 API 响应时，文件大小没有上限。这是 jsonfmt-mcp 和 json-forge-mcp 都做不到的。

> "ClearJSON MCP — the only large-file-safe JSON MCP server. Format, validate, and search any JSON, no matter the size."

---

## 五、实现计划

### 5.1 核心工具（MVP，共 7 个）

| 工具 | 功能 | 说明 |
|------|------|------|
| `format_json` | 格式化/美化 | 输入 JSON 字符串，返回格式化后的 |
| `minify_json` | 压缩 | 去掉空白 |
| `validate_json` | 验证 | 返回是否合法 + 错误位置 |
| `search_json` | 搜索 | 按 key/value/path 搜索，返回匹配项 |
| `query_json` | JSONPath 查询 | 完整 JSONPath 语法支持 |
| `diff_json` | 比对 | 两个 JSON 的深度比对，输出差异报告 |
| `convert_json` | 格式转换 | JSON → CSV/TSV/YAML |

> **关于 JSONPath 和 Diff：** Chrome 扩展阶段砍掉这两个是因为浏览器里已有免费竞品做得好，不值得重造。但 MCP 场景不同——agent 调 tool 时不会去"装另一个 MCP server"，如果没有 JSONPath/Diff，agent 就只能用 bash jq 或手写正则。而且两者都是纯函数（解析完的 JSON 树上跑查询/比对），不涉及 DOM/UI/I/O，加到 MCP server 里成本极低。Chrome 扩展不做是对的，MCP 不做是错失高频需求。 |

### 5.2 架构

```
MCP Client (Claude Code)  →  MCP Server (Node.js)  →  ClearJSON Core
                                                          │
                              stream-parser.js (Worker)  ←  JSON 解析
                              virtual-tree.js            ←  大结果集分页
                              format-converter.js        ←  格式转换
```

从 `src/utils/` 抽取纯函数核心（不依赖 DOM），包装成 npm 包，MCP server 调用它，popup 也调用它。同一份逻辑，两个入口。

### 5.3 包结构

```
clearjson-mcp/
├── package.json          # npm 发布，name: "clearjson-mcp"
├── src/
│   ├── index.js          # MCP server 入口（stdio transport）
│   ├── tools/
│   │   ├── format.js     # 格式化/压缩
│   │   ├── validate.js   # 验证
│   │   ├── search.js     # 搜索
│   │   ├── query.js      # JSONPath 查询
│   │   ├── diff.js       # JSON 深度比对
│   │   └── convert.js    # 格式转换
│   └── core/
│       ├── parser.js     # JSON 解析（从 clearjson/src/utils/ 抽取）
│       ├── stream.js     # Worker 逻辑转为 Node.js 同步/异步
│       └── virtual.js    # 分页逻辑
└── README.md
```

### 5.4 用户接入方式

```json
// 用户的 .claude/mcp.json
{
  "mcpServers": {
    "clearjson": {
      "command": "npx",
      "args": ["-y", "clearjson-mcp"]
    }
  }
}
```

零配置，一条命令。

---

## 六、发布渠道

按优先级：

1. **npm** — 主渠道，`npx clearjson-mcp`
2. **MCP 目录** — mcp.so、smithery.ai、glama.ai/mcp 提交收录
3. **自有渠道** — clearjson.html 产品页加 MCP 区块，GitHub README 加 badge
4. **社区** — HN/红迪讨论 MCP 或 JSON 工具时自然提及

---

## 七、不与现有原则冲突

- ✅ 零后端 — MCP server 在用户本地运行
- ✅ 零运维 — npm 发布后就是静态的，无服务器
- ✅ 本地处理 — 所有 JSON 在用户机器上处理
- ✅ 开源 — MIT License

只是多了一个入口。人用 UI，agent 用 MCP。同一份代码，两个用户。

---

## 八、时间线

| 阶段 | 内容 | 预计 | 实际 |
|------|------|------|------|
| 1 | 从 ClearJSON 抽取核心逻辑为独立 npm 包 | 1 天 | ✅ 2026-07-24 |
| 2 | 封装 MCP server（7 个功能 + 3 个许可证工具） | 1 天 | ✅ 2026-07-24 |
| 3 | 发布到 npm + 添加 Pro 许可证系统 | 0.5 天 | ✅ v1.1.0 |
| 4 | 更新 clearjson.html + GitHub README | 0.5 天 | ⏳ |
| 5 | 注册 MCP 目录（mcp.so、smithery.ai） | 0.5 天 | ⏳ |
