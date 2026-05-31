<div align="center">

# PIA Forge

**合规人自己的开放数据中台**

让每个合规人的 Agent 都能往里写、能从里读，
把零散的合规判断沉淀为可签字、可审计、可复评的结构化资产。

[English](#english) · [中文](#中文)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg)](https://www.postgresql.org/)
[![MCP](https://img.shields.io/badge/MCP-supported-purple.svg)](docs/mcp.md)

</div>

---

## 中文

### 为什么不一样

市面上的合规工具有两类，**都不解决合规人的真问题**：

- 「**律所定制 Word 模板**」：一次性交付，半年后没人维护，团队协作靠群聊补丁
- 「**巨头一站式合规 SaaS**」：自带 LLM、自带流程、自带定价，数据出不了它的栈

PIA Forge 走第三条路：**做底座，不抢 Agent**。

```
合规人已有的 Agent (Claude Code · Cursor · GPT · 通义 · 自建)
                      │
                      │  ① 装 Skill Pack    ② 连 MCP     ③ 调 REST API
                      ▼
            ┌──────────────────────────────┐
            │      PIA Forge 数据中台      │
            │  • 评估项目 + 角色 + 风险    │
            │  • 措施 + 残余风险 + 签字    │
            │  • 全量审计留痕 (PIPL §56)   │
            │  • 报告导出 / 仪表盘 / 复评  │
            └──────────────────────────────┘
                      │
                      ▼
              你自己的 PostgreSQL
```

### 五个 Module · 一个底座

| Module | v | 适用 |
|--------|---|------|
| **PIA** 个人信息保护影响评估 | v0.1 ✅ | PIPL §55-56 / 数据出境 / 敏感 PI 处理 |
| **AUDIT** 合规审计 | v0.2 📋 | 内审 / 子公司审计 / 监管审计 |
| **FILING** 申报与备案 | v0.3 📋 | 数据出境申报 / 承诺函台账 |
| **NOTICE** 告知与同意 | v0.4 📋 | 隐私政策 / 弹窗版本 / 单独同意管理 |
| **INCIDENT** 事件响应 | v0.5 📋 | 数据事件 / 客诉处置 / 反诈线索 |

5 个 module 共用同一套底座（评估对象 + 角色 + 风险 + 措施 + 签字 + 留痕），只在 UI 与 prompt 上差异化。

### 4 层知识 / 记忆体系

合规人最珍贵的资产是「判断逻辑 + 论证链」。PIA Forge 不试图把它们全装进自己的数据库，而是设计了 4 层关系（运行时打开 `/architecture` 可看可视化版本）：

```
L1 · 操作层    PIA Forge              评估过程 / 风险 / 措施 / 结论 / 思考链 / 引用关系
                  ↓ 通过 CitationLink 绑定 commit SHA
L2 · 公共层    法规库 + 知识索引       本系统内 · 跨评估复用 · 人和 Agent 共同维护
                  ↓ 只存指针 + 摘录 + SHA
L3 · 私有层    GitHub Private + 飞书   原始论证 / 判例 / 内审记录 · 永远是你的私有资产
                  ↓ 按需读取 + 摘录
L4 · 记忆层    Agent 自己的工作记忆    Skill / system prompt / 本次任务上下文
```

三条不可让步的边界:
- **PIA Forge 不带 LLM** — 你用你信任的 Agent，本系统只做数据底座 + 开放接口
- **私有知识不进本系统数据库** — 原文留在 L3，本系统只存指针 + 摘录 + commit SHA · 不被 SaaS 绑架
- **每次写入都要留下 Actor 身份** — 人 vs Agent · 谁写的 / 为什么这么写 / 都可独立评估

### 三层开放接口

#### ① Skill Pack ·  挂到你的 Agent 上

把 PIA / Audit 等场景的最佳实践打包成 Skill，装到 Claude Code / Cursor 上，Agent 就懂怎么用 PIA Forge。详见 [skills/](skills/)。

#### ② MCP Server · 给 LLM Agent 用的接口

Agent 通过 Model Context Protocol 直连 PIA Forge，调用 tools（`create_risk` / `add_mitigation` / `generate_report` 等）和读取 resources（PIPL 条款 / GB 标准 / 风险词典）。详见 [docs/mcp.md](docs/mcp.md)。

#### ③ REST API · 任何东西都能调

`GET/POST /api/v1/projects/{id}/risks` 这种最朴素的接口，配合 Bearer Token 鉴权。脚本 / curl / 第三方系统都能接。详见 [docs/api.md](docs/api.md)。

### 设计原则（产品哲学）

1. **不自带 LLM** —— 合规人已经有自己的 Agent，不需要再给一个
2. **法务边界硬约束** —— 法务给合法性意见、不当事实定性裁判
3. **风险量化 + 残余风险闭环** —— 可能性 × 严重程度量化矩阵 · 措施落地后必须重新评级
4. **复评是默认状态** —— 7 类触发条件 + 12 个月强制周期，PIPL §56 留痕 ≥ 3 年自动满足
5. **Agent 是协作者 · 不是裁判** —— Agent 可以起草，但签字必须由人在网页完成

### 快速开始

#### 本地开发

```bash
git clone https://github.com/juejiangxiaopianzi/pia-forge.git
cd pia-forge && cp .env.example .env

npm install
docker compose up -d db
npm run db:push
npm run db:seed
npm run dev
```

打开 http://localhost:3000 ，看到首页 + 一个 demo PIA 项目（猎聘简历出境）即可。详见 [`deploy/local-dev.md`](deploy/local-dev.md)。

#### 部署到阿里云（推荐 · 给非技术合规人）

**只买两样东西**（约 ¥150/月）：
- 阿里云轻量应用服务器 2C 2G · ¥56/月
- 阿里云 RDS PostgreSQL 2C 2G 20GB · ¥88/月

完整步骤见 [`deploy/aliyun.md`](deploy/aliyun.md)。

### 数据模型

```
Organization ─ Membership ─ User ─ ApiToken ─ Agent (一等公民 + AgentSnapshot 版本化)
       │
       ├─ PiaProject (评估项目, type ∈ {PIA, AUDIT, FILING, NOTICE, INCIDENT})
       │     ├─ PiaRole       (角色 RACI)
       │     ├─ DataItem      (信息项 / 控制项)
       │     ├─ Scenario      (出境场景 / 业务流程)
       │     ├─ Risk          (风险 / 审计发现) ───┐
       │     ├─ Mitigation    (控制措施 / 整改项)──┘
       │     ├─ Conclusion    (结论 / 审计意见)
       │     ├─ AuditLog      (全量变更留痕 · Actor 标识)
       │     └─ FieldRevision (字段级历史 + Agent 思考链)
       │
       ├─ LegalReference  (法规库一等公民 · 官方 + 公司内部规章)
       ├─ KnowledgeBase   (外部知识库连接配置 · GitHub Private / 飞书 / 本地)
       ├─ KnowledgeIndex  (路由层 · 这事在哪 / 找谁问)
       ├─ Source          (引用源指针 · type + uri + sha + excerpt)
       └─ CitationLink    (评估对象 ↔ Source 的多对多 · 含 EVIDENCE/DERIVED_FROM 等类型)
```

详见 [`prisma/schema.prisma`](prisma/schema.prisma) 和 [`docs/architecture.md`](docs/architecture.md)。

### Roadmap

- [x] v0.1 PIA module · 数据模型 + REST API + MCP Server + Skill Pack + Markdown 报告
- [x] v0.1.1 Agent 一等公民 · FieldRevision 字段级历史 · 思考链留痕
- [x] v0.1.2 法规库实体化 · KnowledgeBase 连接配置 · KnowledgeIndex 路由层 · 4 层知识体系架构页
- [ ] v0.2 AUDIT module · 复用底座 + 审计专用 prompt
- [ ] v0.3 FILING module · 申报 / 承诺函台账
- [ ] v0.4 NOTICE module · 隐私政策版本管理
- [ ] v0.5 INCIDENT module · 事件响应工作流
- [ ] UI 抛光（苹果风格 / Mac 风格 / 高级感）
- [ ] docx / PDF 报告导出
- [ ] 飞书 OAuth 登录
- [ ] 多语言（中 / 英 / 日）
- [ ] 公开 PIA 范例库（脱敏后社区互查）

### License

[MIT](LICENSE) © 2026 huangyue ([@juejiangxiaopianzi](https://github.com/juejiangxiaopianzi))

---

## English

### TL;DR

**PIA Forge is the compliance professional's own open data backbone.** Every compliance officer / lawyer / data protection officer already has their own AI agent. PIA Forge does NOT bring its own LLM. Instead, it offers three open layers so any external agent can read/write structured compliance assets:

- **Skill Pack** — drop-in workflows for Claude Code / Cursor
- **MCP Server** — native Model Context Protocol endpoint
- **REST API v1** — for everything else

Five modules share one backbone: **PIA · Audit · Filing · Notice · Incident**.

Built with Next.js 14 + Postgres + Prisma. MIT licensed. Self-host on your own infra.

### Quick start

```bash
git clone https://github.com/juejiangxiaopianzi/pia-forge.git
cd pia-forge && cp .env.example .env
npm install && docker compose up -d db
npm run db:push && npm run db:seed && npm run dev
```

See [docs/architecture.md](docs/architecture.md), [docs/api.md](docs/api.md), [docs/mcp.md](docs/mcp.md).

### Aliyun deployment (recommended for China-based teams)

~150 CNY / month total. See [deploy/aliyun.md](deploy/aliyun.md).
