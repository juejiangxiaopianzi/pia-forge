# Changelog

## v0.1.0 · 2026-05-30 · 首发

### 定位

合规人自己的开放数据中台 · 5 个 module 共用 1 个底座 · 3 层开放接口

### 模块状态

- ✅ **PIA** · 个人信息保护影响评估 · 完整可用
- 📋 **AUDIT** · 合规审计 · 数据模型就绪，UI 标签翻译就绪，prompt 待补
- 📋 **FILING** · 申报与备案 · 数据模型就绪
- 📋 **NOTICE** · 告知与同意 · 数据模型就绪
- 📋 **INCIDENT** · 事件响应 · 数据模型就绪

### 已实现

#### 数据层
- Prisma + PostgreSQL · 12 个实体（含 ApiToken / AuditLog / Membership）
- 风险评级公式（可能性 × 严重度）+ 等级阈值（≥15 高 / 8-14 中 / 1-7 低）
- AssessmentType enum 把 5 个 module 抽象在一张表
- AuditSource enum 区分 WEB / REST_API / MCP / SEED 操作来源

#### 网页层
- 首页（hero + 5 module 卡片 + 3 接口卡片 + 最近评估）
- 评估项目列表（按 module 过滤）
- 新建评估（先选 module 再填字段）
- 项目详情（9 个 tab · module-aware 标签）
- 风险登记册 / 信息项 / 出境场景 / 控制措施 / 结论签字 / 仪表盘 / 报告
- 设置 → API Tokens 管理
- 合规法规库 + 接入 Agent + 关于

#### API 层
- REST API v1 全套（projects / risks / mitigations / data-items / scenarios / conclusions / report）
- Bearer Token 鉴权 + 9 种 scope 细粒度授权
- 统一响应格式（`{ok, data}` / `{ok:false, error}`）

#### MCP 层
- Streamable HTTP MCP Server（JSON-RPC 2.0）
- 9 个 tools：list_projects / create_project / get_project / list_risks / create_risk / create_mitigation / create_data_item / submit_conclusion / generate_report
- 5 个 resources：PIPL / GB/T 39335 / GB/T 45574 / 风险类别词典 / RACI 模板

#### Skill Pack
- `skills/pia-forge` · 完整 SKILL.md + install.md + 2 个 prompt 模板
- `skills/audit-forge` · v0.2 规划骨架

#### 部署
- Docker Compose · 本地一键起
- Aliyun 部署指南（傻瓜版）· 月费 ~¥150
- seed 自动生成 demo API Token + 打印 curl 命令

#### 文档
- README（中英双语）
- docs/architecture.md · docs/api.md · docs/mcp.md · docs/modules.md
- CONTRIBUTING.md · SECURITY.md · LICENSE (MIT)

### 待 v0.2

- UI 苹果风 / Mac 风抛光
- AUDIT module 完整 prompt + UI 适配
- 飞书 OAuth 登录
- docx / PDF 报告导出
- 跨 module 关联视图
