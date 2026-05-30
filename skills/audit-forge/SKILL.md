---
name: audit-forge
description: 把内审报告 / 子公司审计资料 / 监管审计材料 / compliance review 输出，转化为 PIA Forge AUDIT module 里的结构化审计项目。复用 PIA Forge 底座，跑 AUDIT 评估类型。
triggers:
  - 帮我跑一次合规审计
  - 整理子公司审计材料
  - 把这份审计 finding 录入系统
  - 内审 / 外审 / 监管审计
version: 0.1.0
status: planning
---

# Audit Forge Skill（v0.2 · 规划中）

> 这是 PIA Forge 平台的第二个 module skill。和 PIA Skill 共用底座，只在 prompt 和工作流上做差异化。

## 与 PIA Skill 的对应关系

| PIA Skill 概念 | Audit 场景里叫 | 说明 |
|---------------|--------------|------|
| 信息项 (DataItem) | 控制点 / 检查项 | 审计依据的具体控制要求 |
| 出境场景 (Scenario) | 业务流程 / 审计范围 | 被审计的业务环节 |
| 风险 (Risk) | 审计发现 (finding) | 不符合 / 改进点 |
| 控制措施 (Mitigation) | 整改项 | 责任人 + 截止时间 + 验证 |
| 结论 (Conclusion) | 审计意见 / 审计报告 | 含整改建议和复审周期 |
| AuditLog | 审计留痕 | 同 |

## 关键差异

- `assessmentType = AUDIT`
- 法规依据：不一定是 PIPL，可能是网安法 / 数安法 / 等保 / 60 号文 / ISO 27001 / 内控
- 评估周期：通常是季度 / 半年 / 年度
- 输出受众：内审委 / 集团 / 监管，而不是 PIA 的「业务方 + 监管」

## v0.2 路线

待 PIA Skill 稳定后展开。
