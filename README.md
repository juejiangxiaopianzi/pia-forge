<div align="center">

# PIA Forge

**把一次性的合规判断 · 沉淀成可复用的评估资产**

Open-source workbench for Personal Information Protection Impact Assessment.
PIPL §55-56 · GB/T 39335-2020 · 数据出境安全评估办法 · GB/T 45574-2025 compliant.

[English](#english) · [中文](#中文)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Made with Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)

</div>

---

## 中文

### 为什么做这个

合规人最大的痛点是：**每一次 PIA 都像第一次。**

- 监管要求出新规 → 翻硬盘找上一份 Word 模板 → 改字段 → 找法务签字 → PDF 归档 → 半年后再来一遍
- 跨部门协作靠群聊+文档+表格三件套，没有单一事实来源
- 风险定级、残余风险接受、签字留痕全靠人肉记忆
- 同样的判断（比如"简历照片算不算敏感个人信息"）被不同客户、不同时间反复辩论

**PIA Forge 把 PIA 当成一个长期的协作资产**，而不是一次性交付件：

- 1 个评估项目 = 7 张协作表 + 1 个仪表盘 + 1 份可签字报告
- 风险评级公式化（可能性 × 严重度），残余风险闭环（措施落地 → 重新评级 → 可接受声明）
- 角色边界硬约束：法务给合法性意见、不当事实定性裁判；产品给数据流真相、不当合规裁判；安全合规主导整体结论
- 7 类复评触发条件 + 12 个月强制周期，PIPL §56 留痕 ≥ 3 年自动满足

### 30 秒预览

```
┌─────────────────────────────────────────────────────┐
│  PIA Forge · 主页                                   │
├─────────────────────────────────────────────────────┤
│  [新建评估]   [查看现有评估]                          │
│                                                     │
│  ▸ PIA-LP-001  猎聘平台简历数据出境          残余·中  │
│     16 信息项 · 5 场景 · 10 风险 · 14 措施           │
│                                                     │
│  ▸ PIA-MB-001  面宝 AI 简历扩展功能          残余·低  │
│     12 信息项 · 2 场景 · 6 风险 · 8 措施             │
└─────────────────────────────────────────────────────┘
```

每个评估项目下有 9 个 Tab：**总览 / 角色（RACI）/ 信息项 / 出境场景 / 风险 / 控制措施 / 结论签字 / 仪表盘 / 报告**。

### 技术栈

- **Next.js 14**（App Router）+ TypeScript + Tailwind + shadcn/ui 风格组件
- **PostgreSQL** + Prisma ORM
- 部署：**Docker Compose**（本地 / 自建服务器）/ 阿里云轻量服务器 + RDS PostgreSQL（推荐）
- 可选：飞书 OAuth / 阿里云 OSS 附件存储 / LLM 辅助起草

### 快速开始

#### 本地开发

```bash
git clone https://github.com/juejiangxiaopianzi/pia-forge.git
cd pia-forge
cp .env.example .env

npm install
docker compose up -d db
npm run db:push
npm run db:seed
npm run dev
```

打开 http://localhost:3000

详见 [`deploy/local-dev.md`](deploy/local-dev.md)。

#### 部署到阿里云（推荐）

只买两样东西 + 跑两条命令。完整步骤见 [`deploy/aliyun.md`](deploy/aliyun.md)。

预估月成本：**¥180-230 / 月**（首年新用户优惠可降到 ¥100/月 内）。

### 截图

> 截图占位 · 上线后补。

| 主页 / 项目列表 | 风险登记册 | 仪表盘 |
|--|--|--|
| _coming_ | _coming_ | _coming_ |

### 数据模型

10 个表覆盖 PIA 完整生命周期：

```
Organization ─ Membership ─ User
       │
       └─ PiaProject (01 评估总览)
            ├─ PiaRole       (02 角色与职责 RACI)
            ├─ DataItem      (03 数据流与信息项清单)
            ├─ Scenario      (04 出境场景清单)
            ├─ Risk          (05 风险登记册) ─┐
            ├─ Mitigation    (06 控制措施) ──┘
            ├─ Conclusion    (07 结论与签字)
            └─ AuditLog      (变更留痕)
```

完整 schema 见 [`prisma/schema.prisma`](prisma/schema.prisma)。

### Roadmap

- [x] v0.1 · 数据模型 + 核心 7 张表 CRUD + 仪表盘 + Markdown 报告导出
- [ ] v0.2 · 飞书 OAuth 登录 + 团队协作 + 评论
- [ ] v0.3 · docx / PDF 报告导出 · 签字流
- [ ] v0.4 · 法规库与法条引用（§28 / §39 / §55-56 / GB 标准）按引用自动反查
- [ ] v0.5 · LLM 辅助起草（描述场景 → 自动产出风险/措施草案，供人工审核）
- [ ] v0.6 · 多语言（中/英）
- [ ] v0.7 · 公开 PIA 共享（脱敏后社区互查）

### License

[MIT](LICENSE) © 2026 huangyue ([@juejiangxiaopianzi](https://github.com/juejiangxiaopianzi))

---

## English

### Why

PIA (Personal Information Protection Impact Assessment) is mandated by PIPL §55-56 and 国标 GB/T 39335-2020 in China.
But it's done as a **one-shot Word doc** in most companies. PIA Forge treats PIA as a **living collaborative asset**: 7 linked tables + 1 dashboard + 1 signable report per assessment.

### Tech stack

Next.js 14 + Postgres + Prisma. Self-host on your own infra. MIT license.

### Quick start

```bash
git clone https://github.com/juejiangxiaopianzi/pia-forge.git
cd pia-forge && cp .env.example .env
npm install && docker compose up -d db
npm run db:push && npm run db:seed && npm run dev
```

Open http://localhost:3000

See [`deploy/aliyun.md`](deploy/aliyun.md) for Aliyun deployment (recommended for China-based teams).
