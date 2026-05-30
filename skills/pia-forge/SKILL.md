---
name: pia-forge
description: 把会议纪要 / PRD / 法规要求 / 客户合规问题，转化为 PIA Forge 里的结构化评估项目 + 风险 + 措施。Agent 用自己的 LLM 起草，把结论写回 PIA Forge 做结构化沉淀 + 签字闭环。
triggers:
  - 帮我做一份 PIA
  - 把这份会议纪要变成评估项目
  - 给这个需求做个数据出境合规判断
  - 起草 PIA 风险
  - 把审计发现写进系统
  - PIA Forge
version: 0.1.0
---

# PIA Forge Skill

把任意非结构化合规输入（会议纪要 / PRD / 法规要求 / 客户问题 / 监管函），转化为 PIA Forge 系统里可签字、可审计、可复评的结构化合规资产。

## 何时使用本 Skill

- 用户提到 PIA / 数据出境 / 合规审计 / 隐私评估 / 风险评估时
- 用户贴出会议纪要 / PRD / 客户邮件，要求"做个合规判断"时
- 用户要求把零散的合规判断"结构化"或"录入系统"时

## 环境要求

1. 用户已部署了 PIA Forge（或使用云端实例）
2. 用户已在 PIA Forge 生成了 API Token
3. 用户已在 MCP 配置里挂了 `pia-forge` server，或者你直接调用 REST API
4. 你（Agent）有自己的 LLM 能力做起草

## 核心工作流

### Step 1 · 理解输入 + 选 Module

读懂用户输入，判断这是什么 module：

| 输入信号 | Module |
|----------|--------|
| 数据出境 / 简历 / PIPL §55 / GB/T 39335 | **PIA** |
| 内审 / 子公司审计 / 监管审计 / 合规体检 | **AUDIT** |
| 网信办申报 / 承诺函 / 备案台账 | **FILING** |
| 隐私政策版本 / 弹窗告知 / 单独同意 | **NOTICE** |
| 数据事件 / 客诉 / 监管约谈 / 反诈线索 | **INCIDENT** |

### Step 2 · 创建评估项目

调用 MCP tool `create_project` 或 REST `POST /api/v1/projects`，**告诉用户编号和链接**让 ta 心里有数：

```
我已经创建了评估项目 PIA-XX-001 「{title}」
在系统里查看：{base_url}/projects/{id}
```

### Step 3 · 提取并写入信息项 / 控制项

从输入中识别需要登记的：
- PIA: 涉及的个人信息字段
- AUDIT: 控制点 / 检查项
- FILING: 申报字段
- NOTICE: 告知要素
- INCIDENT: 事件涉及数据

每一项调用 `create_data_item`。**敏感个人信息必须给出 `legalReasoning` 引用法条**（PIPL §28 / GB/T 35273 / GB/T 45574-2025）。

### Step 4 · 起草风险

用你自己的 LLM 能力，基于输入材料起草 5-15 条风险。每条风险：

- 必须有 `category`（10 选 1）
- `likelihood` 1-5、`severity` 1-5，理由要在 `description` 里讲清楚
- 必须引用 `legalClauses`（具体条款，不要泛泛而谈）
- `strategy` 选 MITIGATE / TRANSFER / ACCEPT / AVOID

调用 `create_risk`。

### Step 5 · 起草控制措施

对每条高风险（riskValue ≥ 15）至少给一条 `create_mitigation`。措施必须有：

- `controlType`（技术 / 流程 / 法律 / 产品 / 培训 / 审计 任选）
- `residualLikelihood` 和 `residualSeverity`（措施落地后的可能性与严重度）
- `acceptable` = ACCEPTABLE / CONDITIONAL / UNACCEPTABLE
- 如果是 CONDITIONAL 必须说清条件

### Step 6 · 写结论 + 告诉用户去签字

调用 `submit_conclusion`。**结论的 state 是 DRAFT，签字必须由人在网页完成**——Agent 不签字。

最后给用户：
```
草案完成 · {n_risks} 风险 · {n_mitigations} 措施 · 整体残余风险等级 {LEVEL}
请到 {base_url}/projects/{id}/conclusion 审阅并签字
```

## 核心原则（必须遵守）

### 1. Agent 是协作者，不是裁判

- ❌ 不要替人签字（state 只能设 DRAFT）
- ❌ 不要替法务下定性裁判（在 `legalReasoning` 里写"建议判定为 X，依据是 Y"，**不要写"判定为 X"**）
- ❌ 不要在敏感 PI 的"存争议"字段直接强行下结论 → 标 `classification: DISPUTED` 留给人裁

### 2. 引用法条要具体

- ✅ "PIPL §28 列举的生物识别信息，结合 GB/T 45574-2025 4.2 的特征提取构成要件"
- ❌ "根据 PIPL 相关规定"

### 3. 数字编造要避免

如果输入材料里没有量级数字（比如出境人次），**留空 + 备注"待数据团队提供"**，不要凭空编。

### 4. 留痕意识

每次调用 PIA Forge tool 都会写一条 AuditLog。用户能看到是「Agent X 在 Y 时间创建了 Z」。所以：
- `X-Agent-Name` header 要自报（比如 `claude-code` / `cursor` / `huangyue-custom-agent`）
- 错误判断的成本是「污染了用户的合规留痕」—— 要慎重

### 5. 报告导出 vs 直接发送

`generate_report` 返回的是 URL，不要试图替用户发邮件 / 发飞书。把 URL 给用户，让他自己决定怎么用。

## Prompt 模板

### 起草风险的 Prompt 范例

```
你是黄越的 PIA 助手。基于下面的输入材料，输出 5-10 条风险登记草案。

【输入材料】
{user_input}

【输出要求】
每条风险一个 JSON 对象，字段：
- name (string)
- category (enum, 见下)
- description (string, 100-300 字)
- likelihood (1-5, 1 极低 5 极高)
- severity (1-5)
- legalClauses (string, 必须引用具体条款)
- strategy (MITIGATE/TRANSFER/ACCEPT/AVOID)

【category 枚举】
LEGAL_BASIS / NECESSITY / NOTICE / CONSENT / RECEIVER / TECH_SECURITY / RIGHTS_HARM / CROSS_BORDER_JURISDICTION / DATA_QUALITY / TRACEABILITY

【纪律】
- 法条引用要具体到 §X 条款，不要写"根据相关规定"
- description 要讲清楚"为什么 likelihood = X、severity = Y"
- 不编造数字，不替人定性，不替法务下裁判
```

### 起草措施的 Prompt 范例

```
基于风险 {risk_name}（{riskValue} 分 · {riskLevel}），起草 1-3 条控制措施。

【风险描述】
{risk_description}

【输出要求】
每条措施 JSON：
- name
- controlType (TECHNICAL/PROCESS/LEGAL/PRODUCT_UX/TRAINING/AUDIT)
- details (具体怎么做，包含责任部门和时间节点)
- residualLikelihood (1-5)
- residualSeverity (1-5)
- acceptable (ACCEPTABLE / CONDITIONAL / UNACCEPTABLE)
- acceptReason (如果是 CONDITIONAL，必须说清条件)
```

## 工作流示例（端到端）

输入：用户贴出一封客户邮件，质疑《数据安全承诺函》中"不含敏感个人信息"的表述。

```
1. → 调 list_projects 看是否已有相关 PIA
2. → 没有的话：create_project (PIA, "客户敏感 PI 表述争议处理 PIA")
3. → create_data_item: 简历照片字段 (classification=DISPUTED, 引用 PIPL §28 + GB/T 45574-2025)
4. → create_risk: 客户单方判定为生物识别致承诺函条款被动调整 (likelihood=4, severity=4, LEGAL_BASIS, MITIGATE)
5. → create_mitigation: 国家级 PIA 备案 + 客户表述调整 SOP (residualLikelihood=2, residualSeverity=3, ACCEPTABLE)
6. → submit_conclusion (DRAFT)
7. → 输出给用户：
   「我已经把这个客户争议沉淀为 PIA 草案，编号 PIA-LP-003
    含 1 个争议信息项、1 条风险、1 条控制措施
    请到 {url} 审阅并签字
    建议把 C-002 客户表述调整 SOP 转给法务跟进」
```

## 反例：什么是错的姿势

❌ Agent 在系统外起草一份 word 文档发给用户 → 没有进结构化沉淀
❌ Agent 调 LLM 写出风险后只在对话里展示 → 没有留痕
❌ Agent 直接把 conclusion.state 设为 SIGNED → 越权
❌ Agent 替法务对"头像是否生物识别"下定论 → 越权
❌ 同一个用户 ID 在多个 module 跨写但不互通 → 应该用 link 字段关联起来
