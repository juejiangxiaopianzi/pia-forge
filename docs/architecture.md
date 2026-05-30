# Architecture

## 产品哲学

> PIA Forge 不是「自带 LLM 的工作站」，而是「**所有 Agent 都能往里写、能从里读的结构化合规中台**」。

合规人已经有自己的 Claude Code / Cursor / 自建 Agent。PIA Forge 不再给一个 LLM —— 它只做四件事：
1. **存** 合规判断的结构化数据
2. **算** 风险等级 / 残余风险 / 复评周期
3. **展示** 给非技术合规人和监管能看懂的网页 + 报告
4. **开放** 三层接口让外部 Agent 协作进来

## 总体拓扑

```
┌──────────────────────────────────────────────────────────────────────┐
│ 用户的 Agent 生态                                                    │
│ Claude Code · Cursor · Claude Desktop · 公司自建 · OpenAI GPTs ...   │
└────────┬───────────────────┬───────────────────┬─────────────────────┘
         │                   │                   │
   ① Skill Pack        ② MCP Server        ③ REST API v1
   (装到 Agent 上,      (JSON-RPC over       (Bearer Token,
    Agent 知道怎么用)    HTTP, MCP 协议)      朴素 CRUD)
         │                   │                   │
         ▼                   ▼                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│ PIA Forge App (Next.js 14 · Standalone)                              │
│                                                                       │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Layer 3 · Module 路由                                            │ │
│ │ PIA · AUDIT · FILING · NOTICE · INCIDENT (共用底座，UI 差异化)   │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Layer 2 · 共享业务（底座）                                       │ │
│ │ Assessment + Roles + DataItems + Scenarios + Risks               │ │
│ │ + Mitigations + Conclusions + Audit Trail                        │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Layer 1 · Prisma Client + auth + audit-log                       │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ TCP 5432
                             ▼
                  ┌────────────────────────┐
                  │ PostgreSQL 16          │
                  │ (Aliyun RDS or local)  │
                  └────────────────────────┘

可选外挂：
  - Aliyun OSS (签字证据 / 整改截图存储)
  - 飞书 OAuth (登录)
```

## 数据模型

10 个实体覆盖合规评估完整生命周期 · 所有 module 共用：

```
Organization ─ Membership ─ User ─ ApiToken
       │
       └─ PiaProject (assessmentType ∈ {PIA, AUDIT, FILING, NOTICE, INCIDENT})
            ├─ PiaRole       (RACI 矩阵)
            ├─ DataItem      (信息项 / 控制项)
            ├─ Scenario      (出境场景 / 业务流程)
            ├─ Risk          (风险 / 审计发现) ───┐
            ├─ Mitigation    (控制措施 / 整改项)──┘
            ├─ Conclusion    (结论 / 审计意见 / 签字)
            └─ AuditLog      (全量变更留痕，source ∈ {WEB,REST_API,MCP,SEED,MIGRATION})
```

完整 schema 见 [`prisma/schema.prisma`](../prisma/schema.prisma)。

## Module 抽象

5 个 module 共用同一套底座，差异化只在两个地方：

| Module | 信息项叫 | 风险叫 | 措施叫 | 结论叫 |
|--------|---------|--------|--------|--------|
| PIA | 信息项 | 风险 | 控制措施 | 评估结论 |
| AUDIT | 控制点 | 审计发现 | 整改项 | 审计意见 |
| FILING | 申报字段 | 申报缺陷 | 补正动作 | 申报材料 |
| NOTICE | 告知要素 | 告知不充分点 | 改版动作 | 政策版本 |
| INCIDENT | 涉及数据 | 影响维度 | 处置动作 | 处置报告 |

底层表名不变，UI 在标题上做翻译。

## 三层接口

### Layer 1 · REST API v1

`/api/v1/*` · Bearer Token 鉴权 · 朴素 RESTful

| 资源 | 端点 |
|------|------|
| 健康检查 | `GET /api/v1/health` |
| 项目 | `GET/POST /api/v1/projects` · `GET/PATCH /api/v1/projects/:id` |
| 风险 | `GET/POST /api/v1/projects/:id/risks` |
| 措施 | `GET/POST /api/v1/projects/:id/mitigations` |
| 信息项 | `GET/POST /api/v1/projects/:id/data-items` |
| 场景 | `GET/POST /api/v1/projects/:id/scenarios` |
| 结论 | `GET/POST /api/v1/projects/:id/conclusions` |
| 报告 | `GET /api/v1/projects/:id/report?format=md\|json` |

详见 [docs/api.md](api.md)。

### Layer 2 · MCP Server

`POST /api/mcp` · JSON-RPC 2.0 over HTTP · 支持 MCP `2024-11-05` 协议

**Tools**: `list_projects` · `create_project` · `get_project` · `list_risks` · `create_risk` · `create_mitigation` · `create_data_item` · `submit_conclusion` · `generate_report`

**Resources**:
- `pia-forge://legal/pipl`
- `pia-forge://legal/gb-39335`
- `pia-forge://legal/gb-45574`
- `pia-forge://taxonomy/risk-category`
- `pia-forge://template/raci`

详见 [docs/mcp.md](mcp.md)。

### Layer 3 · Skill Pack

`skills/` 目录下的 Skill 仓库，可以装到 Claude Code / Cursor 上：

- [pia-forge](../skills/pia-forge/SKILL.md) · PIA 工作流
- [audit-forge](../skills/audit-forge/SKILL.md) · AUDIT 工作流（规划中）
- (后续逐步加 filing / notice / incident)

详见 [skills/README.md](../skills/README.md)。

## 风险评级算法

```
risk_value = likelihood × severity        (1 ≤ each ≤ 5)
risk_level = if value >= 15 then HIGH
             else if value >= 8 then MEDIUM
             else if value >= 1 then LOW
             else UNRATED
```

实现见 `lib/risk.ts` · 前后端共用 · REST/MCP 输出自动带计算字段。

## API Token 与鉴权

- 格式：`pia_<8 hex prefix>.<32 hex secret>`
- 存储：仅 SHA-256 hash 进库，明文只在创建时显示一次
- 鉴权：`Authorization: Bearer <token>` 走 `verifyApiToken()`
- 留痕：每次 API/MCP 写操作自动记 `AuditLog`，含 token 所属 user + agent 自报名

详见 `lib/api-auth.ts` 和 `app/settings/tokens/page.tsx`。

## AuditLog · 满足 PIPL §56 留痕 3 年

每个写操作（来自 WEB / REST_API / MCP / SEED / MIGRATION）都会写一条 AuditLog：

```typescript
{
  resource: "Risk",
  resourceId: "abc123",
  action: "create",
  source: "MCP",
  agentName: "claude-code",
  userId: <token owner>,
  diff: { created: {...} },
  createdAt: <now>
}
```

为什么不用 Prisma middleware：留痕是法定义务，显式写比 hook 漏掉某些手工 SQL 更稳。

## 性能与容量

| 规模 | 推荐配置 |
|------|----------|
| 单组织 · 几十个 PIA · 5-10 人协作 | 现在的轻量服务器 2C2G + RDS 2C2G 20GB 完全够 |
| 多租户 SaaS · 几百个组织 | 升 SAE + RDS 高可用 + Row Level Security |

## 关键设计决策

### 1. 为什么 PiaProject 一张表装 5 个 module

避免重复 schema · 维护一份就够 · 跨 module 报表（看一个组织全部合规状态）天然支持。代价：UI 层要按 `assessmentType` 做命名翻译。

### 2. 为什么不内置 LLM

Module-spec 见上文「产品哲学」。用户已经有 Agent，PIA Forge 抢这个位置是与用户为敌。

### 3. 为什么 AuditLog 不放 SaaS 抽象层而进库

PIPL §56 留痕是法定义务，不是日志。法定义务必须进数据库，必须可导出，必须可审计。

### 4. 为什么用 Prisma 不用 Drizzle

Prisma migration 工具链对非技术运维更友好（`prisma migrate dev` 一条命令），跟「让合规人自部署」定位匹配。

### 5. 为什么 BigInt 出 API 时转 string

annualVolume 这种字段可能上亿，JSON 标准不支持 BigInt 序列化，转 string 是行业惯例。前端按需 parseInt。
