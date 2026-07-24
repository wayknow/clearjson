# ClearJSON — 企划书

> 隐私优先的浏览器 JSON 查看器 + MCP 服务器。
> 200 万用户被背叛后，需要一个值得信任的替代品。
> 最后更新：2026-07-24 | 状态：Chrome 扩展 + MCP 均已上线

---

## 一、为什么做这个

### 1.1 市场事件

2025 年初，拥有 **200 万+ 用户**、2100+ 条评价、开源维护了 10 年的 JSON Formatter Chrome 扩展被出售给新团队。新团队：

- 关闭了源代码
- 注入 GiveFreely 广告到用户浏览的网页
- 通过 MaxMind GeoIP 追踪用户地理位置
- 向 `api.givefreely.com` 发送数据
- 劫持 localhost 页面

Hacker News 曝光后，200 万用户开始寻找替代品。

### 1.2 当前竞争格局

一年内涌现了 5 个替代品：

| 替代品 | 作者 | 特点 | 商业模式 |
|--------|------|------|---------|
| TreeJSON | 个人 | MIT 开源、JSON/YAML/XML | 免费 |
| JSON Alexander | Wes Bos | 知名开发者出品 | 免费开源 |
| JSON Formatter (arnav-kr) | 个人 | 60+ 主题 | 免费开源 |
| Just JSON | 个人 | 21KB 极轻量 | 免费 |
| JSON Viewer Plus | 个人 | 20+ 主题 | 免费 |

**结论：全部是免费开源的个人热情项目，没有人在做商业化。**

### 1.3 窗口

- 200 万用户在找新工具
- 老大赛道空出来了
- 所有新玩家都在抢"最好用的免费工具"，没人在抢"能赚钱的工具"
- 隐私变成了这个品类的核心卖点

---

## 二、产品定位

> "你信任的 JSON 查看器。开源、本地、零追踪。"

三个关键词：

1. **信任**——开源（MIT），代码可审计，不像被卖掉的旧工具
2. **隐私**——全本地处理，不发送任何数据，连匿名统计都没有
3. **好用**——不只是格式化，是真正帮开发者理解和操作 JSON 数据

---

## 三、目标用户

| 用户 | 场景 | 频率 |
|------|------|------|
| 后端开发 | 调试 API 返回的 JSON 响应 | 每天几十次 |
| 前端开发 | 查看网络请求里的 JSON payload | 每天 |
| 数据分析 | 预览大型 JSON 数据集 | 每周 |
| DevOps | 检查配置文件 | 偶尔 |

核心用户画像：每天跟 JSON 打交道的开发者。

---

## 四、竞品分析

### 4.1 市场老大（已被用户抛弃）

| 维度 | 旧 JSON Formatter |
|------|-------------------|
| 用户量 | 200 万+ |
| 状态 | 被卖、注入广告、追踪用户 |
| 致命伤 | 从开源变闭源、劫持网页 |

### 4.2 5 个新替代品

| | TreeJSON | JSON Alexander | arnav-kr | Just JSON | Viewer Plus |
|------|:--:|:--:|:--:|:--:|:--:|
| 开源 | ✅ MIT | ✅ | ✅ | ❌ | ❌ |
| 零追踪 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 离线 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 大文件 | ❌ | ❌ | ❌ | ❌ | ❌ |
| JSONPath | ✅ | ✅ | ❌ | ❌ | ✅ |
| 导出 CSV | ✅ | ❌ | ❌ | ❌ | ❌ |
| Diff 对比 | ❌ | ❌ | ❌ | ✅ | ❌ |
| 60+ 主题 | ❌ | ❌ | ✅ | ❌ | ✅ 20+ |
| 商业化 | ❌ | ❌ | ❌ | ❌ | ❌ |

共同缺陷：
- **都不处理大文件**（10MB+ JSON 全都会卡）
- **都没有商业化**（全是免费，没有收入就没有长期维护的承诺）
- **功能分散在不同工具里**（有人有 Diff、有人有 CSV 导出、没有人全有）
- **都没有 AI 集成**（2026 年了）

---

## 五、功能规划

### 5.1 免费版（永远免费）

```
✅ JSON 自动检测 → 格式化 → 语法高亮
✅ 可折叠树形导航 + 缩进引导线
✅ 行号显示
✅ 浅色/深色主题（5 种基础主题）
✅ 复制节点值 / 复制 JSONPath
✅ 链接自动识别可点击
✅ 图片 URL 预览
✅ 全本地处理，零网络请求
✅ MIT 开源，GitHub 公开
✅ 支持 localhost 和 file:// URL
```

### 5.2 Pro 版 — $29 终身买断（扩展）

```
💰 大文件优化：虚拟滚动，100MB JSON 不卡
💰 JWT 自动解码（Header + Payload 内联展示）
💰 高级搜索（正则表达式，匹配导航，全文档高亮）
💰 多格式导出（CSV / TSV / YAML / TypeScript 递归类型推断）
💰 30 种主题（含 Monokai、Dracula、Nord、One Dark、Solarized、Catppuccin…）
💰 自定义快捷键（6 个全可定制）
```

### 5.3 MCP Server（npm: clearjson-mcp）

同一份 Pro license 覆盖扩展和 MCP 两个入口：

```
免费工具：format_json / minify_json / validate_json / search_json
Pro 工具（需 license）：query_json / diff_json / convert_json
许可证管理：activate_license / license_status / deactivate_license
```

JSONPath 和 Diff 在 Chrome 扩展阶段被砍（浏览器已有免费竞品），但 MCP 场景 agent 高频需求，纯函数成本极低，补回来了。详见 [AGENT_FIRST.md](AGENT_FIRST.md)。

### 5.4 不做的

- ❌ 不上传任何数据到任何服务器
- ❌ 不注册账号
- ❌ 不接广告
- ❌ 不追踪
- ❌ 不弹窗
- ❌ 不变成闭源

---

## 六、技术架构

### 6.1 选型

| 层 | 选型 | 原因 |
|----|------|------|
| 框架 | Vanilla JS（无框架） | 插件体积敏感 |
| JSON 解析 | 浏览器原生 `JSON.parse` + 流式解析 | 零依赖 |
| 大文件 | 虚拟滚动（IntersectionObserver + 懒渲染） | 100MB 不卡 |
| 语法高亮 | 自研轻量 tokenizer | 不引入 highlight.js 这种重库 |
| 主题 | CSS 变量切换 | 即时换肤 |
| 存储 | chrome.storage.local | 设置本地存储 |
| 开源 | GitHub MIT License | 信任基础 |

### 6.2 目录结构（预估）

```
clearjson/
├── manifest.json
├── src/
│   ├── popup/            # 插件弹窗（设置入口）
│   ├── content/          # 内容脚本（检测 JSON 页面并格式化）
│   ├── viewer/           # 独立查看器页面（粘贴 JSON、Diff）
│   └── utils/
│       ├── parser.js     # JSON 解析 + 流式处理
│       ├── tokenizer.js  # 语法高亮 tokenizer
│       ├── tree.js       # 虚拟滚动树形视图
│       └── diff.js       # JSON Diff 算法
├── themes/
├── icons/
└── README.md
```

### 6.3 核心数据流

```
用户打开 JSON URL（或 API 返回 JSON）
    → content.js 检测 Content-Type: application/json
    → 接管页面渲染（替换原始文本为格式化视图）
    → 树形导航 + 语法高亮
    → 用户可折叠/展开节点、搜索、复制
```

---

## 七、定价与 ROI

### 7.1 定价

| 方案 | 价格 | 到手 |
|------|------|------|
| 免费版 | $0 | — |
| 终身买断 | $29 | $26.10 |
| 月付订阅 | $2/月 | $1.80/月 |
| 年付订阅 | $20/年 | $18.00/年 |

### 7.2 预估（保守）

开发者工具品类的免费→付费转化率通常 3-5%。

| 阶段 | 安装量 | 付费用户 | 月收入 |
|------|--------|---------|--------|
| 起步（1-3 月） | 2,000 | 60 | $1,566 |
| 增长（4-6 月） | 8,000 | 240 | $6,264 |
| 稳定（7-12 月） | 20,000 | 600 | $15,660 |

**首年预估总收入：$50,000-80,000**

### 7.3 为什么开发者会付费

- 大文件处理是硬需求——免费替代品都做不了
- JSONPath 查询省时间——手动在嵌套 JSON 里找字段是折磨
- Diff 对比——调试 API 变更时必需
- CSV 导出——数据分析场景的刚需
- $29 对于开发者工具是冲动消费价位（CSS Scan $69 都卖了 1450 份）

---

## 八、推广策略

### 8.1 借势

- Hacker News 已有关于旧工具背叛用户的热帖——**发布时直接引用**
- Reddit r/webdev, r/programming, r/javascript 都在讨论替代品
- 标题："I rebuilt JSON Formatter after the original went rogue — open source, zero tracking"

### 8.2 Product Hunt

- 开发者工具在 PH 上表现好（CSS Scan 两次发布都拿了 750+ 和 1900+ 票）
- 发布时间选周二/周三

### 8.3 GitHub 开源

- 开源本身就是推广——开发者信任开源
- Star 数多了会自然带来用户和贡献者
- 可以在 README 里放 Chrome Web Store 链接

### 8.4 与 SnapMark 交叉推广

- SnapMark 用户看到 "ClearJSON"，ClearJSON 用户看到 "SnapMark"
- 两个产品覆盖同一群人（开发者）的不同需求

---

## 九、风险

| 风险 | 等级 | 对策 |
|------|------|------|
| Chrome 未来可能内置 JSON 格式化 | 低 | Chrome 十年没做，短期不会 |
| 竞争加剧 | 中 | 开源 + 隐私 + 大文件是护城河 |
| 大文件处理技术难度 | 中 | 虚拟滚动是成熟技术，有现成方案参考 |
| 免费替代品足够好，没人付费 | 中 | 大文件和 JSONPath 是免费工具做不到的 |

---

## 十、与 SnapMark 的关系

```
SnapMark          ClearJSON
    ↘              ↙
   截图标注        JSON 查看

   共同点：
   - 都是浏览器工具
   - 都是"隐私优先 + 本地处理 + 无水印"
   - 都是"免费版够用 + 一次性买断 Pro"
   - 都卖给开发者

   不同点：
   - SnapMark 面向所有人（截图是通用需求）
   - ClearJSON 面向开发者（JSON 是专业需求）
   - SnapMark 竞品多但都有缺陷
   - ClearJSON 竞品全是免费、老大赛道真空

   协同：
   - 产品矩阵：一个通用工具 + 一个专业工具
   - 交叉推广：从截图用户里挖掘 JSON 用户，反之亦然
   - 品牌积累：两个产品共享"隐私优先 + 买断制"的口碑
```

---

## 十一、实际进展（vs 企划）

| 企划 | 实际 |
|------|------|
| JSONPath / Diff 在扩展 Pro 里 | ❌ 砍掉——浏览器市场已有免费竞品做得好 |
| 订阅制（$2/月） | ❌ 砍掉——纯客户端无持续成本，终身买断就够了 |
| JSONPath / Diff 在 MCP 里 | ✅ 补回来了——agent 场景高频需求，纯函数成本低 |
| AI 集成 | ❌ 不做——隐私矛盾 + API 成本不可控 |
| MCP Server | ✅ 新增——企划时没想到，但 agent-first 思路是自然的延伸 |
| 扩展 Pro 功能 | ✅ 全部实现（大文件/JWT/搜索/导出/主题/快捷键） |
| Chrome Web Store 上架 | ✅ v1.0.0 已上架，v1.1.1 审核中 |
| npm 发布 | ✅ clearjson-mcp v1.1.0 |
| Product Hunt | ✅ 7/14 发布，28 展示 → 15 安装 |

当前待办：MCP 目录收录、CWS 关键词优化、中文社区推广。
