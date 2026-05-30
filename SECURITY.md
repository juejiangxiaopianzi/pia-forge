# Security Policy

## 报告安全漏洞

如果你发现了 PIA Forge 的安全漏洞，请**不要**通过公开 issue 报告。

发邮件到：`security@<你的部署域名>`（或在仓库主页找维护者私信）

报告应包含：
- 漏洞描述与影响范围
- 复现步骤
- （可选）你建议的修复方向

收到报告 7 天内会回复确认，30 天内会发布补丁或给出说明。

## 安全相关的设计选择

### Token 存储

API Token 在数据库中**仅存 SHA-256 哈希**。明文 Token 只在创建时显示一次。即使数据库被脱库，攻击者拿不到可用的 Token。

### 审计留痕

所有写操作（来自 WEB / REST_API / MCP / SEED）都自动写入 `AuditLog` 表。这是 PIPL §56 法定义务（留痕 ≥ 3 年）。

留痕字段包含：
- 操作人（user）+ 操作 Agent（agentName）
- 操作类型 + 资源 + 资源 ID
- 完整字段 diff（before / after）
- 时间戳

### 默认隔离

- 每个 `ApiToken` 绑定到具体 `User` 和 `Organization`
- 所有 API 端点都用 `organizationId` 做软隔离（多租户安全）
- Token 可以限定 scope（最小权限原则）

### 关键安全建议（部署方）

1. **必须改 `.env` 默认值**：`NEXTAUTH_SECRET` / `API_TOKEN_SIGNING_SECRET` 必须用长随机字符串替换
2. **数据库白名单**：RDS 只允许应用服务器 IP 连接，不要开 0.0.0.0/0
3. **HTTPS 强制**：上生产时启用 HTTPS（Aliyun SLB / Nginx Let's Encrypt）
4. **Token 定期轮换**：长期 Token 建议每 6-12 个月轮换
5. **OSS 私有读写**：附件证据存 OSS 时 ACL 设为 private
6. **不要把 .env 提交到 GitHub**：`.gitignore` 已配置，不要破坏

### 不在 PIA Forge 责任范围内的事

- LLM API Key 安全 —— PIA Forge 不存这种东西（不内置 LLM）
- 用户自己 Agent 的安全 —— 由用户保障
- 用户上传到 OSS 的附件 —— 用户自己决定加密策略

## 已知非漏洞

- 默认 demo `seed.ts` 创建的是固定示例数据 · **生产部署后请重置或修改**
- 当前 v0.1 没有强制 HTTPS（部署方自行加 Nginx / SLB）
- v0.1 没有强制 2FA（v0.2 计划）
