# ClearJSON License Server

Cloudflare Workers + D1 搭建的 License 签发与验证服务。

## 架构

```
Extension (Chrome)    →  POST /api/license/verify    →  Cloudflare Worker  →  D1 (SQLite)
Creem (payment)       →  POST /api/webhook/creem      →  Cloudflare Worker  →  D1 (SQLite)
You (admin)           →  POST /api/license/generate   →  Cloudflare Worker  →  D1 (SQLite)
```

## 快速部署

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 创建 D1 数据库

```bash
npx wrangler d1 create clearjson-license-db
```

复制输出的 `database_id`，粘贴到 `wrangler.toml` 的 `[[d1_databases]]` 段：

```toml
[[d1_databases]]
binding = "DB"
database_name = "clearjson-license-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   # ← 填这里
```

### 3. 初始化数据库表

```bash
npm run db:init
```

### 4. 设置管理员密钥

```bash
# 生成强随机密码:
openssl rand -base64 32

# 设为 Worker secret:
npx wrangler secret put ADMIN_API_KEY
# 粘贴上面生成的密码
```

### 5. 生成 API Token（可选，用于更细粒度的权限管理）

```bash
echo -n "your-strong-random-token-here" | node scripts/generate-token.js admin
```

复制输出的 SQL 命令并执行。

### 6. 部署

```bash
npm run deploy
```

部署成功后你会得到 `https://clearjson-license.<your-subdomain>.workers.dev`。

### 7. 绑定自定义域名（可选）

在 Cloudflare Dashboard → Workers & Pages → clearjson-license → Triggers → Custom Domains
添加路由 `api.wayknow.tech/clearjson/*`（或独立域名）。

## API 文档

### Base URL

`https://<your-worker>.workers.dev` 或自定义域名。

---

### POST /api/license/verify

验证 License Key 是否有效，并绑定设备。

**Public**（无需认证，但有 IP 限流：60/min）

**Request:**
```json
{
  "license_key": "CLJ-A3F9-B7C2-D1E8",
  "device_id": "a1b2c3d4-...",
  "device_name": "MacBook Pro"
}
```

**Response (valid):**
```json
{
  "valid": true,
  "tier": "pro",
  "email": "user@example.com",
  "activations": 1,
  "max_devices": 3,
  "created_at": "2025-07-01 12:00:00",
  "expires_at": null
}
```

**Response (invalid):**
```json
{
  "valid": false,
  "error": "not_found"
}
```

Error codes: `not_found` | `revoked` | `expired` | `device_limit_reached` | `invalid_format` | `rate_limited`

---

### POST /api/license/generate

手动生成 License Key。

**Auth:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "email": "user@example.com",
  "count": 1
}
```

**Response:**
```json
{
  "keys": ["CLJ-A3F9-B7C2-D1E8"],
  "email": "user@example.com",
  "count": 1
}
```

---

### POST /api/webhook/creem

接收 Creem 支付成功的回调，自动生成 License Key。

**Public**（需验证 Creem 签名）

Creem 支付成功后自动调用，生成 License Key 并存入数据库。

---

### GET /api/admin/licenses

查询 License 列表。

**Auth:** `Authorization: Bearer <token>`

**Query params:**
- `email` — 按邮箱搜索（可选）
- `limit` — 每页数量（默认 50，最大 200）
- `offset` — 偏移量（默认 0）

---

### GET /api/health

健康检查。

## 扩展端集成

ClearJSON 扩展和 MCP Server 都需要在线验证。扩展在 `license.js` 中，MCP 在 `clearjson-mcp/src/core/license.js` 中。

每次启动时调用一次 `POST /api/license/verify`，成功后缓存结果到本地存储。缓存有效期 7 天，服务器不可达时降级为本地格式校验。

## License Key 格式

```
CLJ-XXXX-XXXX-XXXX
│   │    │    │
│   └────┴────┴── 3 组，每组 4 位（A-Z, 2-9，不含 0/1 避免混淆）
└── 前缀
```

共计 16 位字符，理论空间 `29^12 ≈ 3.5 × 10^17` 个组合。

## 定价

Cloudflare Workers 免费套餐：
- 10 万请求/天
- D1: 5GB 存储，500 万读/月
- 足够支持数千 Pro 用户的日常验证
