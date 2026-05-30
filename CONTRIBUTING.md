# Contributing to PIA Forge

谢谢你想为 PIA Forge 出力。

## 项目立场

- **不做面向 LLM 的"全自动合规"**。AI 辅助起草可以有，但 PIA 的法律责任在人，不在 AI。
- **不做企业级"合规 SaaS"销售**。这个项目永远 MIT 免费、永远可以自部署。
- **法律条款的解释权属于监管 + 律师**。我们提供工具，不提供法律意见。

## 怎么贡献

| 你想干啥 | 怎么做 |
|----------|--------|
| 报 bug | 开 issue · 注明操作系统、Node 版本、Postgres 版本、复现步骤 |
| 提新功能 | 先开 issue 讨论 · 大改动建议先有设计 |
| 修法规库 | 法规库在 `app/library/page.tsx`，欢迎贡献 PIPL / 评估办法 / GB 标准条款解读 |
| 翻译 | 暂时只有中文 UI；i18n 框架已留 (`next-intl`)，欢迎补英文 |

## 开发流程

```bash
git clone https://github.com/juejiangxiaopianzi/pia-forge.git
cd pia-forge && npm install
cp .env.example .env
docker compose up -d db
npm run db:push && npm run db:seed
npm run dev
```

## 风格

- TypeScript strict mode
- 函数命名直接、不文艺
- 注释只写 WHY，不写 WHAT
- 中文 commit 也可以，但建议英文方便国际协作

## 法律免责声明

本项目提供的法规条款解读、PIA 范式、风险/措施清单**仅供参考**，不构成法律意见。
在做出实际合规决策前，请咨询有执业资格的律师 / 合规顾问 / 监管部门。
