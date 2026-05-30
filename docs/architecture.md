# Architecture

## 总体

```
┌──────────────────────────────────────────────────────┐
│  Browser (Next.js Server Components + Client UI)     │
└──────────────────────┬───────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼───────────────────────────────┐
│  Next.js App (Standalone Output)                     │
│   ┌──────────────────────────────────────────────┐   │
│   │  App Router · Server Actions                 │   │
│   │  - / projects / library / about              │   │
│   │  - /api/projects/:id/report.md               │   │
│   └──────────────────────┬───────────────────────┘   │
│                          │                            │
│   ┌──────────────────────▼───────────────────────┐   │
│   │  Prisma Client (lib/db.ts)                   │   │
│   └──────────────────────┬───────────────────────┘   │
└──────────────────────────┼───────────────────────────┘
                           │ TCP (5432 · 内网)
              ┌────────────▼────────────┐
              │ PostgreSQL 16            │
              │ (Aliyun RDS or local)    │
              └──────────────────────────┘

可选：
  - Aliyun OSS   (附件 / 签字证据)
  - 飞书 OAuth   (登录)
  - LLM API     (风险/措施草案辅助生成)
```

## 数据模型

参见 [`prisma/schema.prisma`](../prisma/schema.prisma)。10 个实体：

- **Organization / User / Membership** — 多租户基础
- **PiaProject** — 一次 PIA 评估
- **PiaRole** — RACI 矩阵
- **DataItem** — 信息项清单（敏感分类、出境标记、合法性基础）
- **Scenario** — 出境场景
- **Risk** — 风险登记册（可能性 × 严重度）
- **Mitigation** — 控制措施 + 残余风险
- **Conclusion** — 结论签字
- **AuditLog** — 全量变更留痕（PIPL §56 留痕 3 年）

## 风险评级算法

```
risk_value = likelihood × severity
risk_level = if value >= 15 then HIGH
             else if value >= 8 then MEDIUM
             else if value >= 1 then LOW
             else UNRATED
```

实现见 `lib/risk.ts`。前后端共用。

## 角色权限（计划中）

| 角色 | 创建评估 | 编辑信息项 | 评分风险 | 接受残余风险 | 签字 |
|------|----------|------------|----------|--------------|------|
| OWNER | ✓ | ✓ | ✓ | ✓ | ✓ |
| ADMIN | ✓ | ✓ | ✓ | ✓ | — |
| MEMBER | — | ✓（owned） | ✓（owned） | — | — |
| VIEWER | — | — | — | — | — |

## 关键设计决策

### 1. 为什么用 Prisma 不用 Drizzle

Prisma 的迁移工具链对非技术运维更友好（`prisma migrate dev` 一条命令），与本项目「让合规人也能自部署」的定位匹配。性能上 Drizzle 更好但 PIA 这种场景没有性能瓶颈。

### 2. 为什么风险等级是 enum 不是 derived field

PIPL §56 要求"采取的保护措施是否合法、有效并与风险程度相适应"。风险等级会被引用到结论与签字阶段，需要可独立审计。前端按公式自动算 + 后端字段冗余保存，二者必须一致（CI 校验 TODO）。

### 3. 为什么用 PostgreSQL 不用 MySQL

PostgreSQL 原生支持 enum / array / jsonb 字段，对 RACI 多选标识、合法性基础多选、信息项的敏感子类型多选这类场景 schema 表达力强。

### 4. AuditLog 为什么不用 Prisma 中间件而是显式写

避免自动化的 hook 漏掉某些手工 SQL；显式写更接近"留痕是法定义务，不是日志"的语义。

## 性能 / 容量

- 单组织 < 50 个评估项目 · 每个评估 < 100 信息项 + 50 风险 · 20 措施 = SQLite 都能跑
- 多租户 SaaS 模式（未来）需要在 PiaProject 上加 organizationId 索引（已加）+ Row Level Security
