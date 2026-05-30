## 这个 PR 做了什么

...

## 影响范围

- [ ] 数据模型变更（需要 prisma migrate）
- [ ] API 变更（破坏性 / 非破坏性）
- [ ] MCP Server 变更（tools / resources）
- [ ] Skill Pack 更新
- [ ] UI 抛光
- [ ] 文档更新
- [ ] 仅测试 / 重构

## 自查清单

- [ ] 没有把 `.env` / Token / 密钥提交进来
- [ ] 没有引入 LLM 调用（PIA Forge 不内置 LLM）
- [ ] 写入操作经过 `logAudit()` 留痕
- [ ] schema 变更已运行 `npx prisma format`
- [ ] 若改 API，已更新 `docs/api.md`
- [ ] 若改 MCP tools/resources，已更新 `docs/mcp.md`
- [ ] 若改 UI 标签，已用 `lib/module-labels.ts` 抽象
- [ ] 截图 / 录屏（如有 UI 变更）

## 相关 Issue

Closes #...
