# PIA Forge · Skill Pack

> 把 PIA Forge 的工作流打包成可以挂到 Agent 上的 Skill。一个 Skill = 一种合规产物 module 的最佳实践。

## 当前 Skills

| Skill | Module | 状态 | 用途 |
|-------|--------|------|------|
| [pia-forge](pia-forge/SKILL.md) | PIA | ✅ v0.1 | 个人信息保护影响评估 |
| [audit-forge](audit-forge/SKILL.md) | AUDIT | 📋 规划中 v0.2 | 合规审计（内审 / 子公司审计） |
| filing-forge | FILING | 📋 规划中 v0.3 | 申报与备案台账 |
| notice-forge | NOTICE | 📋 规划中 v0.4 | 隐私政策 / 告知版本管理 |
| incident-forge | INCIDENT | 📋 规划中 v0.5 | 事件响应 / 客诉处置 |

## 如何贡献新 Skill

把 PIA Forge 任何一个 module 的工作流封装成 Skill，欢迎 PR：

1. 在 `skills/<your-module>/` 下新建目录
2. 写 `SKILL.md`（frontmatter + 工作流 + 原则）
3. 写 `install.md`（安装到 Claude Code / Cursor 的步骤）
4. 可选：`prompts/` 目录放范例 prompt

参考 `pia-forge/SKILL.md` 的结构。

## 设计原则（所有 Skill 共用）

1. **Agent 是协作者，不是裁判** —— 不替人签字、不替法务定性
2. **法条引用要具体** —— 必须到 §X 而不是泛泛"根据规定"
3. **不编造数字** —— 没有的就标"待数据团队提供"
4. **留痕意识** —— 所有写操作都会进 AuditLog，要慎重
5. **结构化优先** —— 进 PIA Forge 系统才算沉淀，对话里讲出来不算
