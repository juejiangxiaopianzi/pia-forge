/**
 * PIA Forge · MCP Server (Streamable HTTP)
 *
 * 让外部 LLM Agent（Claude Code / Cursor / Claude Desktop / 任何 MCP-compatible client）
 * 通过 Model Context Protocol 直连本系统，调用 tools 和读取 resources。
 *
 * 接入方在自己的 mcp config 里加：
 *   {
 *     "mcpServers": {
 *       "pia-forge": {
 *         "url": "https://<your-server>/api/mcp",
 *         "headers": { "Authorization": "Bearer pia_xxxx.xxxxx" }
 *       }
 *     }
 *   }
 *
 * 当前实现：JSON-RPC 2.0 over HTTP（MCP 协议核心兼容），不包含 SSE streaming，足够 90% 场景。
 * v0.2 升级到完整 streamable transport。
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyApiToken, requireScope, type AuthContext } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit-log';
import { resolveActor, actorToLastEditFields } from '@/lib/actor';
import { riskValue, riskLevelOf } from '@/lib/risk';
import { writeFieldRevisions } from '@/lib/field-revision';
import { writeCitations } from '@/lib/citations';
import { notifyReviewRequest } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const SERVER_INFO = {
  name: 'pia-forge',
  version: '0.1.0',
  description: 'PIA Forge · 合规人开放数据中台 · 通过 MCP 让 Agent 把合规判断沉淀为结构化资产',
};

const PROTOCOL_VERSION = '2024-11-05';

// ────────────────────────────────────────────────────────────────────────
// Tools 定义
// ────────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_projects',
    description: '列出当前 Token 所在组织的全部评估项目（PIA / Audit / Filing 等所有 module）。',
    inputSchema: {
      type: 'object',
      properties: {
        assessmentType: { type: 'string', enum: ['PIA', 'AUDIT', 'FILING', 'NOTICE', 'INCIDENT'], description: '按 module 类型过滤' },
      },
    },
  },
  {
    name: 'create_project',
    description: '创建一个新评估项目。assessmentType 决定走哪个 module 模板。',
    inputSchema: {
      type: 'object',
      required: ['title', 'code'],
      properties: {
        assessmentType: { type: 'string', enum: ['PIA', 'AUDIT', 'FILING', 'NOTICE', 'INCIDENT'], default: 'PIA' },
        code: { type: 'string', description: '编号，如 PIA-XX-001' },
        title: { type: 'string' },
        scope: { type: 'string', description: '评估范围' },
        purpose: { type: 'string', description: '评估目的' },
        legalBases: { type: 'array', items: { type: 'string' }, description: '依据法规列表' },
      },
    },
  },
  {
    name: 'get_project',
    description: '获取单个评估项目的详情和计数摘要。',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: { projectId: { type: 'string' } },
    },
  },
  {
    name: 'create_risk',
    description: '在指定评估项目下创建风险。新口径请按 GB/T 39335-2020 国标填写:风险源/威胁事件/受影响主体 + 个人权益影响 4 维(0-4) + 安全事件可能性 4 因素(0-4)。likelihood/severity 旧字段可不填(由 Overall 同步)。强烈建议同时传 reasoning(含 impactReasoning/factorReasoning 逐项理由)和 citations。',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'name', 'category', 'strategy'],
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        category: { type: 'string', enum: ['LEGAL_BASIS', 'NECESSITY', 'NOTICE', 'CONSENT', 'RECEIVER', 'TECH_SECURITY', 'RIGHTS_HARM', 'CROSS_BORDER_JURISDICTION', 'DATA_QUALITY', 'TRACEABILITY'] },
        description: { type: 'string' },

        // 旧口径(兼容) · 可不填
        likelihood: { type: 'number', minimum: 1, maximum: 5, description: '旧口径 1-5 · 可不填,默认从 likelihoodOverall(0-4) 线性映射 ((x*5/4) 向上取整)' },
        severity:   { type: 'number', minimum: 1, maximum: 5, description: '旧口径 1-5 · 可不填,默认从 impactOverall(0-4) 线性映射' },

        // GB/T 39335 三段叙事
        riskSource:        { type: 'string', description: '风险源 · 哪个环节(收集/存储/出境/接收方)+哪个字段+什么处理活动' },
        threatEvent:       { type: 'string', description: '威胁事件 · 具体可能发生什么(泄露/被滥用/被重识别等)' },
        affectedSubjects:  { type: 'string', description: '受影响个人信息主体范围+量级估算 · 如"通过境外 IP 访问的求职者,约 637 万/年"' },

        // GB/T 39335 §5.5 个人权益影响 4 维 (0=无 1=低 2=中 3=高 4=严重)
        impactDecide:       { type: 'number', minimum: 0, maximum: 4, description: 'a) 限制个人自主决定权(0-4)' },
        impactDiscriminate: { type: 'number', minimum: 0, maximum: 4, description: 'b) 引发差别性待遇(0-4)' },
        impactReputation:   { type: 'number', minimum: 0, maximum: 4, description: 'c) 名誉受损或精神压力(0-4)' },
        impactProperty:     { type: 'number', minimum: 0, maximum: 4, description: 'd) 人身财产受损(0-4)' },
        impactOverall:      { type: 'number', minimum: 0, maximum: 4, description: '4 维综合(默认取 max,Agent 可加权)' },

        // GB/T 39335 §5.4 + §5.6 安全事件可能性 4 因素
        factorNetwork:      { type: 'number', minimum: 0, maximum: 4, description: 'a) 网络环境和技术措施(0-4)' },
        factorProcess:      { type: 'number', minimum: 0, maximum: 4, description: 'b) 个人信息处理流程规范性(0-4)' },
        factorPersonnel:    { type: 'number', minimum: 0, maximum: 4, description: 'c) 参与人员与第三方(0-4)' },
        factorBusiness:     { type: 'number', minimum: 0, maximum: 4, description: 'd) 业务特点和规模及安全态势(0-4)' },
        likelihoodOverall:  { type: 'number', minimum: 0, maximum: 4, description: '4 因素综合(默认取 max)' },

        legalClauses: { type: 'string', description: '触及法条 · 可填多条用 ; 分隔。具体引用请走 citations 字段挂 Source。' },
        strategy: { type: 'string', enum: ['MITIGATE', 'TRANSFER', 'ACCEPT', 'AVOID'] },
        reasoning: {
          type: 'object',
          description: 'Agent 的思考链 · 含读什么/备选/选择/理由,以及国标 4 维 4 因素的逐项评分理由',
          properties: {
            read: { type: 'array', items: { type: 'string' }, description: '本次起草前读过的文档/法规/案例' },
            considered: { type: 'array', items: { type: 'string' }, description: '考虑过的备选判断' },
            chose: { type: 'string', description: '最终选择' },
            why: { type: 'string', description: '为什么这么选' },
            impactReasoning: {
              type: 'object',
              description: '4 维权益影响逐项评分理由 · key 与字段名一致',
              properties: {
                impactDecide: { type: 'string' },
                impactDiscriminate: { type: 'string' },
                impactReputation: { type: 'string' },
                impactProperty: { type: 'string' },
              },
            },
            factorReasoning: {
              type: 'object',
              description: '4 因素可能性逐项评分理由',
              properties: {
                factorNetwork: { type: 'string' },
                factorProcess: { type: 'string' },
                factorPersonnel: { type: 'string' },
                factorBusiness: { type: 'string' },
              },
            },
          },
        },
        citations: {
          type: 'array',
          description: '引用源 · 把这个风险绑定到法规/私有知识库/会议记录等具体文档,自动 upsert Source + 写 CitationLink。绑 commit sha 后老引用永不腐烂。',
          items: {
            type: 'object',
            required: ['type', 'uri', 'citationType'],
            properties: {
              type: { type: 'string', enum: ['GITHUB_FILE', 'FEISHU_DOC', 'FEISHU_MESSAGE', 'FEISHU_WIKI', 'FEISHU_SHEET', 'FEISHU_BASE', 'EMAIL', 'FILE', 'URL', 'AGENT_MEMORY', 'EXTERNAL_API', 'OTHER'] },
              uri: { type: 'string', description: '稳定标识 · GitHub 用 github://owner/repo/path@sha · 飞书用 feishu://docx/TOKEN 或公网 URL' },
              title: { type: 'string' },
              excerpt: { type: 'string', description: '抓取时的原文片段 · 防原文失效断链' },
              citationType: { type: 'string', enum: ['EVIDENCE', 'DERIVED_FROM', 'DISCUSSED_IN', 'SIGNED_OFF_IN', 'CONTRADICTED_BY', 'REFERENCE'] },
              citationExcerpt: { type: 'string', description: '本次引用的具体片段 · 为啥引这条' },
              scope: { type: 'string', enum: ['PRIVATE', 'PROJECT', 'ORG'], default: 'PROJECT' },
            },
          },
        },
      },
    },
  },
  {
    name: 'list_risks',
    description: '列出某评估项目下的全部风险（含计算字段 riskValue/riskLevel）。',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: { projectId: { type: 'string' } },
    },
  },
  {
    name: 'create_mitigation',
    description: '为指定风险添加一项控制措施。residualLikelihood × residualSeverity 自动算残余风险。',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'riskId', 'name', 'controlType'],
      properties: {
        projectId: { type: 'string' },
        riskId: { type: 'string' },
        name: { type: 'string' },
        controlType: { type: 'string', enum: ['TECHNICAL', 'PROCESS', 'LEGAL', 'PRODUCT_UX', 'TRAINING', 'AUDIT'] },
        details: { type: 'string' },
        dueAt: { type: 'string', description: 'YYYY-MM-DD' },
        residualLikelihood: { type: 'number', minimum: 1, maximum: 5 },
        residualSeverity: { type: 'number', minimum: 1, maximum: 5 },
        acceptable: { type: 'string', enum: ['ACCEPTABLE', 'CONDITIONAL', 'UNACCEPTABLE', 'NOT_EVALUATED'] },
        acceptReason: { type: 'string' },
      },
    },
  },
  {
    name: 'create_data_item',
    description: '在评估项目下登记一个信息项 / 控制项（PIA 里叫信息项，AUDIT 里叫控制项，复用同一张表）。',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'name'],
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        classification: { type: 'string', enum: ['GENERAL', 'SENSITIVE', 'NON_PI', 'DISPUTED'] },
        sensitiveSub: { type: 'array', items: { type: 'string', enum: ['BIOMETRIC', 'SPECIFIC_IDENTITY', 'MEDICAL_HEALTH', 'FINANCIAL', 'WHEREABOUTS', 'MINOR_UNDER_14', 'RELIGION', 'SEXUAL_ORIENTATION', 'UNDISCLOSED_CRIMINAL'] } },
        legalReasoning: { type: 'string', description: '定性依据（引用条款）' },
        isOutbound: { type: 'boolean' },
        legalBasis: { type: 'string', enum: ['SEPARATE_CONSENT', 'GENERAL_CONSENT', 'CONTRACT_NECESSITY', 'LEGAL_OBLIGATION', 'PUBLIC_INTEREST', 'EMERGENCY', 'PUBLIC_INFO', 'OTHER'] },
      },
    },
  },
  {
    name: 'submit_conclusion',
    description: '提交评估结论（v0.x），含整体结论、给业务方建议、给监管口径、签字人。',
    inputSchema: {
      type: 'object',
      required: ['projectId', 'title', 'residualLevel'],
      properties: {
        projectId: { type: 'string' },
        title: { type: 'string' },
        overallVerdict: { type: 'string' },
        residualLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'UNRATED'] },
        highRiskSummary: { type: 'string' },
        businessAdvice: { type: 'string' },
        regulatorTone: { type: 'string' },
        nextReviewAt: { type: 'string', description: 'YYYY-MM-DD' },
      },
    },
  },
  {
    name: 'generate_report',
    description: '导出评估项目的完整报告（Markdown），供 Agent 进一步加工或发送。',
    inputSchema: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { type: 'string' },
        format: { type: 'string', enum: ['md', 'json'], default: 'md' },
      },
    },
  },
  {
    name: 'list_sources',
    description: '检索公共/团队知识库中的法规/文档(Source)。Agent 在写定性依据前应先调本工具拿对应 Source · 然后用 source uri 填到 citations payload 里。',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: '关键词 · 命中 title/excerpt/tags/body' },
        knowledgeBaseId: { type: 'string', description: '只看这个知识库下的内容' },
        scope: { type: 'string', enum: ['PRIVATE', 'PROJECT', 'TEAM', 'ORG'] },
        tag: { type: 'string', description: '按标签过滤 · 如 「§28」「出境」' },
      },
    },
  },
  {
    name: 'read_source',
    description: '读取某条 Source 的全文 body(markdown)。给 Agent 用来获取上下文做判断。',
    inputSchema: {
      type: 'object',
      required: ['sourceId'],
      properties: {
        sourceId: { type: 'string' },
      },
    },
  },
  {
    name: 'create_source',
    description: '向公共/私有知识库写入一条新内容。Agent 用来录入新法规、新解读、新沟通纪要。',
    inputSchema: {
      type: 'object',
      required: ['type', 'uri', 'title'],
      properties: {
        knowledgeBaseId: { type: 'string', description: '归属哪个 KB · 可空' },
        type: { type: 'string', enum: ['GITHUB_FILE', 'FEISHU_DOC', 'FEISHU_MESSAGE', 'FEISHU_WIKI', 'FEISHU_SHEET', 'FEISHU_BASE', 'EMAIL', 'FILE', 'URL', 'AGENT_MEMORY', 'EXTERNAL_API', 'OTHER'] },
        uri: { type: 'string', description: '稳定标识 · GitHub 用 github://owner/repo/path@sha · URL 直接公网链接' },
        title: { type: 'string' },
        body: { type: 'string', description: 'markdown 全文 · 用于系统内预览' },
        excerpt: { type: 'string', description: '简短摘要' },
        tags: { type: 'array', items: { type: 'string' } },
        scope: { type: 'string', enum: ['PRIVATE', 'PROJECT', 'TEAM', 'ORG'], default: 'PROJECT' },
        projectId: { type: 'string' },
      },
    },
  },
  {
    name: 'list_knowledge_bases',
    description: '列出当前组织所有知识库连接(公共法规 / 团队 wiki / 私人 GitHub)。Agent 通常先调用本工具拿到 KB 列表,再按 scope 决定从哪里检索 Source。',
    inputSchema: {
      type: 'object',
      properties: {
        scope: { type: 'string', enum: ['PRIVATE', 'TEAM', 'ORG'], description: '只看某个 scope 的 KB' },
      },
    },
  },
  {
    name: 'list_knowledge_indexes',
    description: '检索知识索引("这事在哪/找谁问")。Agent 在面对不熟悉的主题时应先调本工具查路由，再去拉具体 Source。',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '主题关键词' },
      },
    },
  },
  {
    name: 'add_comment',
    description: '在某个对象(Risk / DataItem / Mitigation / Scenario / Conclusion / PiaProject / PiaRole)上留评论。Agent 在不确定/想留个判断脚注/想 @ 某人时应主动用本工具。',
    inputSchema: {
      type: 'object',
      required: ['targetType', 'targetId', 'body'],
      properties: {
        targetType: { type: 'string', description: 'Risk / DataItem / Mitigation / Scenario / Conclusion / PiaProject / PiaRole' },
        targetId: { type: 'string' },
        body: { type: 'string', description: '评论正文 · markdown' },
        mentions: { type: 'array', items: { type: 'string' }, description: '@ 的 userId 数组' },
        replyToId: { type: 'string', description: '回复哪条评论 · 可空' },
      },
    },
  },
  {
    name: 'list_comments',
    description: '列出某对象上的全部评论(树状)。',
    inputSchema: {
      type: 'object',
      required: ['targetType', 'targetId'],
      properties: {
        targetType: { type: 'string' },
        targetId: { type: 'string' },
      },
    },
  },
  {
    name: 'assign_task',
    description: '把某条记录派给某人处理(写完定性/补充证据/审一下措施落地)。Agent 在判断"这事得给某某看一下"时应直接派任务而非只留评论。',
    inputSchema: {
      type: 'object',
      required: ['targetType', 'targetId', 'assigneeUserId'],
      properties: {
        targetType: { type: 'string' },
        targetId: { type: 'string' },
        assigneeUserId: { type: 'string' },
        note: { type: 'string', description: '派单说明 · 让对方知道要做什么' },
        dueAt: { type: 'string', description: 'YYYY-MM-DD · 截止时间' },
      },
    },
  },
  {
    name: 'my_tasks',
    description: '查询某个 user 的待办任务列表。Agent 自我管理或代办时用。不传 assigneeUserId 时默认当前 token 背后的 user。',
    inputSchema: {
      type: 'object',
      properties: {
        assigneeUserId: { type: 'string', description: '不填 = 当前 actor.userId' },
        status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'AWAITING_REVIEW', 'DONE', 'CANCELLED'] },
      },
    },
  },
  {
    name: 'request_review',
    description: 'Agent 改了某字段后,不直接落,改成请人审阅。把当前值/建议值/理由都填上,生成一条 ReviewRequest。专门用于 Agent 谨慎修改(尤其是定性/法条/同意基础这种敏感字段)。',
    inputSchema: {
      type: 'object',
      required: ['targetType', 'targetId', 'rationale', 'reviewerUserId'],
      properties: {
        targetType: { type: 'string' },
        targetId: { type: 'string' },
        fieldName: { type: 'string', description: '建议修改的字段名 · 可空表示整体重审' },
        currentValue: { type: 'string', description: '当前值' },
        proposedValue: { type: 'string', description: '建议改成的值' },
        rationale: { type: 'string', description: '为什么要改 · 必填' },
        reviewerUserId: { type: 'string', description: '请谁审' },
      },
    },
  },
  {
    name: 'list_pending_reviews',
    description: '列出待我审阅的请求(默认当前 actor.userId · 也可传 reviewerUserId 查别人)。',
    inputSchema: {
      type: 'object',
      properties: {
        reviewerUserId: { type: 'string' },
      },
    },
  },
];

// ────────────────────────────────────────────────────────────────────────
// Resources 定义（法规库 / 词典 / 模板）
// ────────────────────────────────────────────────────────────────────────

const RESOURCES = [
  {
    uri: 'pia-forge://legal/pipl',
    name: 'PIPL 关键条款（§17 §28 §38-43 §55-56）',
    description: '个人信息保护法与 PIA 直接相关的条款全文与适用要点',
    mimeType: 'text/markdown',
  },
  {
    uri: 'pia-forge://legal/gb-39335',
    name: 'GB/T 39335-2020 PIA 方法论',
    description: '个人信息安全影响评估指南国家标准要点',
    mimeType: 'text/markdown',
  },
  {
    uri: 'pia-forge://legal/gb-45574',
    name: 'GB/T 45574-2025 敏感个人信息处理安全要求',
    description: '2025 新国标 · 敏感 PI 子类型构成要件',
    mimeType: 'text/markdown',
  },
  {
    uri: 'pia-forge://taxonomy/risk-category',
    name: '风险类别词典',
    description: '10 大风险类别的判定边界',
    mimeType: 'application/json',
  },
  {
    uri: 'pia-forge://template/raci',
    name: 'RACI 角色模板',
    description: 'PIA / Audit 通用的 RACI 矩阵模板',
    mimeType: 'application/json',
  },
];

const RESOURCE_BODIES: Record<string, string> = {
  'pia-forge://legal/pipl': `# PIPL 关键条款

## §17 告知义务（充分性）
处理个人信息前应当以显著方式、清晰易懂的语言真实、准确、完整地向个人告知...

## §28 敏感个人信息定义
一旦泄露或者非法使用，容易导致自然人的人格尊严受到侵害或者人身、财产安全受到危害的个人信息，包括生物识别、宗教信仰、特定身份、医疗健康、金融账户、行踪轨迹等信息，以及不满十四周岁未成年人的个人信息。

## §38-43 向境外提供个人信息
四条路径：① 安全评估 ② 个人信息保护认证 ③ 标准合同 ④ 法律法规规定的其他条件

## §39 出境告知 + 单独同意
应当向个人告知境外接收方的名称或者姓名、联系方式、处理目的、处理方式、个人信息的种类以及个人向境外接收方行使本法规定权利的方式和程序等事项，并取得个人的单独同意。

## §55 应当进行 PIA 的五类情形
1. 处理敏感个人信息
2. 利用个人信息进行自动化决策
3. 委托处理 / 共享 / 公开个人信息
4. 向境外提供个人信息
5. 其他对个人权益有重大影响的处理活动

## §56 PIA 内容 + 留痕 ≥ 3 年
应当包括：处理目的方式合法性、对个人权益的影响及安全风险、所采取的保护措施是否合法有效与风险程度相适应。报告和处理情况记录应当至少保存三年。
`,
  'pia-forge://legal/gb-39335': `# GB/T 39335-2020 PIA 方法论

四个步骤：
1. 评估范围确定 — 主体、数据流、生命周期边界
2. 风险识别 — 合法性 / 必要性 / 接收方 / 技术 / 权益侵害 等维度
3. 风险分析评价 — 可能性 × 严重程度矩阵
4. 报告编写 — 含结论、缓解措施、残余风险、留痕

本系统的字段设计与此对齐：
- DataItem / Scenario = 评估范围
- Risk = 风险识别 + 评价
- Mitigation = 缓解措施 + 残余风险
- Conclusion = 报告 + 签字 + 复评机制
- AuditLog = 留痕 ≥ 3 年
`,
  'pia-forge://legal/gb-45574': `# GB/T 45574-2025 敏感个人信息处理安全要求

新国标 2025 · 关键扩充：

## 敏感 PI 子类型构成要件
- **生物识别**：需经技术处理得到的特征模板（人脸照片本身不构成生物识别，必须做了特征提取）
- **特定身份**：身份证 / 护照 / 户籍等
- **医疗健康**：诊疗记录 / 健康档案 / 重大疾病史
- **金融账户**：账号 / 密码 / 余额 / 交易记录
- **行踪轨迹**：实时位置 / 历史轨迹 / 出行记录
- **14 岁以下未成年人**：所有个人信息

## 处理活动安全要求
- 单独同意 + 告知必要性
- 加密存储 / 传输
- 访问控制 + 最小必要
- 留痕 + 审计
`,
  'pia-forge://taxonomy/risk-category': JSON.stringify({
    LEGAL_BASIS: '合法性基础 · 是否有 PIPL §13 / §27-29 / §39 的合法性基础',
    NECESSITY: '必要性 / 最小必要 · 处理目的与字段是否成比例',
    NOTICE: '告知充分性 · §17 / §39 要求的告知要素是否齐全',
    CONSENT: '同意获取与撤回 · 同意是否明确、可撤回',
    RECEIVER: '接收方资质与控制 · 境外接收方法律义务覆盖',
    TECH_SECURITY: '技术安全 / 泄漏 · 加密、访问控制、防护强度',
    RIGHTS_HARM: '个人权益侵害 · 人格尊严 / 财产 / 名誉 / 就业 / 安全',
    CROSS_BORDER_JURISDICTION: '跨境管辖 · 接收方所在国法律强制配合调取',
    DATA_QUALITY: '数据质量与可携 · 撤回权 / 删除权 / 可携权落实',
    TRACEABILITY: '留痕与可审计 · 满足 §56 留痕 3 年',
  }, null, 2),
  'pia-forge://template/raci': JSON.stringify({
    roles: [
      { type: 'PIA_LEAD', label: '评估主理人', raci: ['R', 'A'] },
      { type: 'LEGAL_LEAD', label: '法务负责人 · 合法性论证', raci: ['R', 'C'], note: '不当事实定性裁判' },
      { type: 'C_END_PRODUCT', label: 'C 端产品 · 求职者侧数据流', raci: ['R', 'C'] },
      { type: 'B_END_PRODUCT', label: 'B 端产品 · 出境场景', raci: ['R', 'C'] },
      { type: 'DATA_TEAM', label: '数据团队 · 量级口径', raci: ['R'] },
      { type: 'ENGINEERING', label: '研发 · 技术事实', raci: ['R', 'C'] },
      { type: 'SECURITY_AUDIT', label: '安全审核中心 · 接收方画像', raci: ['R'] },
      { type: 'COMPLIANCE_OFFICER', label: '合规专员 · 留痕维护', raci: ['R', 'I'] },
      { type: 'EXEC_APPROVER', label: 'CTO / 高管签字', raci: ['A'] },
      { type: 'EXTERNAL_COUNSEL', label: '外部法律顾问（可选）', raci: ['C'] },
    ],
  }, null, 2),
};

// ────────────────────────────────────────────────────────────────────────
// JSON-RPC 路由
// ────────────────────────────────────────────────────────────────────────

type RpcRequest = { jsonrpc: '2.0'; id?: string | number; method: string; params?: any };
type RpcResponse =
  | { jsonrpc: '2.0'; id: string | number | null; result: any }
  | { jsonrpc: '2.0'; id: string | number | null; error: { code: number; message: string; data?: any } };

function rpcResult(id: any, result: any): RpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, result };
}
function rpcError(id: any, code: number, message: string, data?: any): RpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message, data } };
}

export async function POST(req: Request) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) {
    return NextResponse.json(rpcError(null, -32001, 'Unauthorized · 需要 Bearer Token'), { status: 401 });
  }

  let body: RpcRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, 'Parse error'), { status: 400 });
  }

  if (body.jsonrpc !== '2.0' || !body.method) {
    return NextResponse.json(rpcError(body.id, -32600, 'Invalid Request'));
  }

  try {
    const result = await dispatch(body.method, body.params, ctx, req);
    return NextResponse.json(rpcResult(body.id, result));
  } catch (e: any) {
    return NextResponse.json(rpcError(body.id, e.code ?? -32603, e.message ?? 'Internal error'));
  }
}

export async function GET(req: Request) {
  // 简单的元信息端点 · 方便用 curl 探活
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  return NextResponse.json({
    server: SERVER_INFO,
    protocolVersion: PROTOCOL_VERSION,
    authenticated: !!ctx,
    tools: TOOLS.map((t) => t.name),
    resources: RESOURCES.map((r) => r.uri),
    endpoint: 'POST application/json with JSON-RPC 2.0 body',
  });
}

async function dispatch(method: string, params: any, ctx: AuthContext, req: Request): Promise<any> {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: { tools: {}, resources: {} },
      };

    case 'tools/list':
      return { tools: TOOLS };

    case 'resources/list':
      return { resources: RESOURCES };

    case 'resources/read': {
      const uri = params?.uri;
      const body = RESOURCE_BODIES[uri];
      if (!body) throw withCode(-32602, `Resource not found: ${uri}`);
      const mime = RESOURCES.find((r) => r.uri === uri)?.mimeType ?? 'text/plain';
      return { contents: [{ uri, mimeType: mime, text: body }] };
    }

    case 'tools/call': {
      const { name, arguments: args } = params ?? {};
      return await callTool(name, args ?? {}, ctx, req);
    }

    case 'ping':
      return { ok: true, time: new Date().toISOString() };

    default:
      throw withCode(-32601, `Method not found: ${method}`);
  }
}

async function callTool(name: string, args: any, ctx: AuthContext, req: Request): Promise<any> {
  const actor = await resolveActor(ctx, req.headers);

  switch (name) {
    case 'list_projects': {
      requireScope(ctx, 'READ_PROJECTS');
      const list = await db.piaProject.findMany({
        where: {
          organizationId: ctx.organizationId,
          assessmentType: args.assessmentType ?? undefined,
        },
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { risks: true, mitigations: true, dataItems: true, scenarios: true } } },
      });
      return wrapResult(list);
    }

    case 'get_project': {
      requireScope(ctx, 'READ_PROJECTS');
      const project = await db.piaProject.findFirst({
        where: { id: args.projectId, organizationId: ctx.organizationId },
        include: {
          _count: { select: { risks: true, mitigations: true, dataItems: true, scenarios: true, roles: true } },
        },
      });
      if (!project) throw withCode(-32602, '评估项目不存在');
      return wrapResult(project);
    }

    case 'create_project': {
      requireScope(ctx, 'WRITE_PROJECTS');
      const project = await db.piaProject.create({
        data: {
          organizationId: ctx.organizationId,
          assessmentType: args.assessmentType ?? 'PIA',
          code: args.code,
          title: args.title,
          scope: args.scope ?? '',
          purpose: args.purpose ?? '',
          legalBases: args.legalBases ?? [],
          startedAt: new Date(),
          leaderId: ctx.userId,
          reviewTriggers: args.reviewTriggers ?? '',
        },
      });
      await logAudit({ projectId: project.id, actor, resource: 'PiaProject', resourceId: project.id, action: 'create', source: 'MCP',diff: { created: project } });
      return wrapResult(project);
    }

    case 'list_risks': {
      requireScope(ctx, 'READ_RISKS');
      const project = await db.piaProject.findFirst({ where: { id: args.projectId, organizationId: ctx.organizationId } });
      if (!project) throw withCode(-32602, '评估项目不存在');
      const risks = await db.risk.findMany({
        where: { projectId: project.id },
        orderBy: [{ likelihood: 'desc' }, { severity: 'desc' }],
        include: { dataItems: true, scenarios: true, mitigations: true },
      });
      return wrapResult(
        risks.map((r) => ({
          ...r,
          riskValue: riskValue(r.likelihood, r.severity),
          riskLevel: riskLevelOf(riskValue(r.likelihood, r.severity)),
        }))
      );
    }

    case 'create_risk': {
      requireScope(ctx, 'WRITE_RISKS');
      const project = await db.piaProject.findFirst({ where: { id: args.projectId, organizationId: ctx.organizationId } });
      if (!project) throw withCode(-32602, '评估项目不存在');
      const count = await db.risk.count({ where: { projectId: project.id } });

      // ─── GB/T 39335 字段标准化 ─────────────────
      const impactDecide       = clamp04(args.impactDecide);
      const impactDiscriminate = clamp04(args.impactDiscriminate);
      const impactReputation   = clamp04(args.impactReputation);
      const impactProperty     = clamp04(args.impactProperty);
      const impactOverall      = args.impactOverall != null
        ? clamp04(args.impactOverall)
        : Math.max(impactDecide, impactDiscriminate, impactReputation, impactProperty);

      const factorNetwork    = clamp04(args.factorNetwork);
      const factorProcess    = clamp04(args.factorProcess);
      const factorPersonnel  = clamp04(args.factorPersonnel);
      const factorBusiness   = clamp04(args.factorBusiness);
      const likelihoodOverall = args.likelihoodOverall != null
        ? clamp04(args.likelihoodOverall)
        : Math.max(factorNetwork, factorProcess, factorPersonnel, factorBusiness);

      // 旧字段兼容:Agent 没传时,从 Overall(0-4) 线性映射到 1-5
      // 0→1 1→2 2→3 3→4 4→5;impact 同样
      const likelihoodLegacy = args.likelihood ?? Math.max(1, likelihoodOverall + 1);
      const severityLegacy   = args.severity   ?? Math.max(1, impactOverall + 1);

      const r = await db.risk.create({
        data: {
          projectId: project.id,
          code: args.code ?? `R-${String(count + 1).padStart(3, '0')}`,
          name: args.name,
          category: args.category,
          description: args.description ?? '',
          likelihood: likelihoodLegacy,
          severity: severityLegacy,
          legalClauses: args.legalClauses ?? '',
          filerId: ctx.userId,
          strategy: args.strategy,
          // GB/T 39335 字段
          riskSource: args.riskSource ?? null,
          threatEvent: args.threatEvent ?? null,
          affectedSubjects: args.affectedSubjects ?? null,
          impactDecide,
          impactDiscriminate,
          impactReputation,
          impactProperty,
          impactOverall,
          factorNetwork,
          factorProcess,
          factorPersonnel,
          factorBusiness,
          likelihoodOverall,
          ...actorToLastEditFields(actor),
        },
      });

      // FieldRevision + reasoning 链 · 新字段一起记
      const trackedFields = [
        'name','category','description','likelihood','severity','legalClauses','strategy',
        'riskSource','threatEvent','affectedSubjects',
        'impactDecide','impactDiscriminate','impactReputation','impactProperty','impactOverall',
        'factorNetwork','factorProcess','factorPersonnel','factorBusiness','likelihoodOverall',
      ];
      const changes = trackedFields.map((f) => ({ field: f, oldValue: null, newValue: (r as any)[f] }));
      await writeFieldRevisions({
        projectId: project.id,
        resource: 'Risk',
        resourceId: r.id,
        changes,
        actor,
        source: 'MCP',
        reasoning: args.reasoning ?? null,
      });

      // citations payload → Source + CitationLink
      const citationStats = await writeCitations(
        {
          organizationId: ctx.organizationId,
          projectId: project.id,
          resource: 'Risk',
          resourceId: r.id,
          actor,
        },
        args.citations,
      );

      await logAudit({ projectId: project.id, actor, resource: 'Risk', resourceId: r.id, action: 'create', source: 'MCP', diff: { created: r, citations: citationStats } });
      return wrapResult({
        ...r,
        riskValue: r.likelihood * r.severity,
        riskLevel: riskLevelOf(r.likelihood * r.severity),
        citations: citationStats,
      });
    }

    case 'create_mitigation': {
      requireScope(ctx, 'WRITE_MITIGATIONS');
      const project = await db.piaProject.findFirst({ where: { id: args.projectId, organizationId: ctx.organizationId } });
      if (!project) throw withCode(-32602, '评估项目不存在');
      const count = await db.mitigation.count({ where: { projectId: project.id } });
      const m = await db.mitigation.create({
        data: {
          projectId: project.id,
          riskId: args.riskId,
          code: args.code ?? `C-${String(count + 1).padStart(3, '0')}`,
          name: args.name,
          controlType: args.controlType,
          details: args.details ?? '',
          ownerId: ctx.userId,
          dueAt: args.dueAt ? new Date(args.dueAt) : null,
          residualLikelihood: args.residualLikelihood ?? null,
          residualSeverity: args.residualSeverity ?? null,
          acceptable: args.acceptable ?? 'NOT_EVALUATED',
          acceptReason: args.acceptReason ?? null,
        },
      });
      await logAudit({ projectId: project.id, actor, resource: 'Mitigation', resourceId: m.id, action: 'create', source: 'MCP',diff: { created: m } });
      return wrapResult(m);
    }

    case 'create_data_item': {
      requireScope(ctx, 'WRITE_PROJECTS');
      const project = await db.piaProject.findFirst({ where: { id: args.projectId, organizationId: ctx.organizationId } });
      if (!project) throw withCode(-32602, '评估项目不存在');
      const count = await db.dataItem.count({ where: { projectId: project.id } });
      const d = await db.dataItem.create({
        data: {
          projectId: project.id,
          code: args.code ?? `DI-${String(count + 1).padStart(3, '0')}`,
          name: args.name,
          classification: args.classification ?? 'GENERAL',
          sensitiveSub: args.sensitiveSub ?? [],
          legalReasoning: args.legalReasoning ?? '',
          isOutbound: args.isOutbound ?? false,
          legalBasis: args.legalBasis ?? null,
          necessity: args.necessity ?? '',
          ownerId: ctx.userId,
        },
      });
      await logAudit({ projectId: project.id, actor, resource: 'DataItem', resourceId: d.id, action: 'create', source: 'MCP',diff: { created: d } });
      return wrapResult(d);
    }

    case 'submit_conclusion': {
      requireScope(ctx, 'WRITE_CONCLUSIONS');
      const project = await db.piaProject.findFirst({ where: { id: args.projectId, organizationId: ctx.organizationId } });
      if (!project) throw withCode(-32602, '评估项目不存在');
      const c = await db.conclusion.create({
        data: {
          projectId: project.id,
          title: args.title,
          evaluationTarget: project.title,
          overallVerdict: args.overallVerdict ?? '',
          residualLevel: args.residualLevel,
          highRiskSummary: args.highRiskSummary ?? '',
          businessAdvice: args.businessAdvice ?? '',
          regulatorTone: args.regulatorTone ?? '',
          signerId: ctx.userId,
          nextReviewAt: args.nextReviewAt ? new Date(args.nextReviewAt) : null,
          reviewTriggers: project.reviewTriggers,
          state: 'DRAFT',
        },
      });
      await logAudit({ projectId: project.id, actor, resource: 'Conclusion', resourceId: c.id, action: 'create', source: 'MCP',diff: { created: c } });
      return wrapResult(c);
    }

    case 'generate_report': {
      requireScope(ctx, 'GENERATE_REPORT');
      const fullUrl = new URL(req.url);
      const reportUrl = `${fullUrl.origin}/api/v1/projects/${args.projectId}/report?format=${args.format ?? 'md'}`;
      return wrapResult({
        message: 'Report URL ready · 用 Token 拉取下面的 URL 即可获得报告',
        url: reportUrl,
        format: args.format ?? 'md',
      });
    }

    case 'list_sources': {
      requireScope(ctx, 'READ_PROJECTS');
      const where: any = { organizationId: ctx.organizationId };
      if (args.knowledgeBaseId) where.knowledgeBaseId = args.knowledgeBaseId;
      if (args.scope) where.scope = args.scope;
      if (args.tag) where.tags = { has: args.tag };
      if (args.q) {
        where.OR = [
          { title: { contains: args.q, mode: 'insensitive' } },
          { excerpt: { contains: args.q, mode: 'insensitive' } },
          { body: { contains: args.q, mode: 'insensitive' } },
          { tags: { has: args.q } },
        ];
      }
      const items = await db.source.findMany({
        where,
        orderBy: [{ scope: 'asc' }, { capturedAt: 'desc' }],
        take: 200,
        select: { id: true, type: true, uri: true, title: true, excerpt: true, tags: true, scope: true, knowledgeBaseId: true, capturedAt: true },
      });
      return wrapResult({ count: items.length, items });
    }

    case 'read_source': {
      requireScope(ctx, 'READ_PROJECTS');
      const s = await db.source.findFirst({
        where: { id: args.sourceId, organizationId: ctx.organizationId },
        include: { knowledgeBase: { select: { id: true, name: true, type: true, scope: true } } },
      });
      if (!s) throw withCode(-32602, 'Source 不存在');
      return wrapResult(s);
    }

    case 'create_source': {
      requireScope(ctx, 'WRITE_PROJECTS');
      const created = await db.source.create({
        data: {
          organizationId: ctx.organizationId,
          knowledgeBaseId: args.knowledgeBaseId ?? null,
          type: args.type,
          uri: args.uri,
          title: args.title,
          body: args.body ?? null,
          excerpt: args.excerpt ?? null,
          tags: args.tags ?? [],
          scope: args.scope ?? 'PROJECT',
          projectId: args.projectId ?? null,
          capturedByActorType: actor.type as any,
          capturedByUserId: actor.userId,
          capturedByAgentId: actor.agentId,
        },
      });
      return wrapResult(created);
    }

    case 'list_knowledge_bases': {
      requireScope(ctx, 'READ_PROJECTS');
      const where: any = { organizationId: ctx.organizationId };
      if (args.scope) where.scope = args.scope;
      const items = await db.knowledgeBase.findMany({
        where,
        orderBy: [{ scope: 'asc' }, { createdAt: 'asc' }],
        include: { _count: { select: { indexes: true } } },
      });
      // also count sources per KB
      const sourceCounts = await db.source.groupBy({
        by: ['knowledgeBaseId'],
        where: { organizationId: ctx.organizationId },
        _count: { _all: true },
      });
      const countMap = new Map(sourceCounts.map((c) => [c.knowledgeBaseId, c._count._all]));
      return wrapResult({
        count: items.length,
        items: items.map((kb) => ({ ...kb, sourceCount: countMap.get(kb.id) ?? 0 })),
      });
    }

    case 'list_knowledge_indexes': {
      requireScope(ctx, 'READ_PROJECTS');
      const where: any = { organizationId: ctx.organizationId };
      if (args.topic) {
        where.OR = [
          { topic: { contains: args.topic, mode: 'insensitive' } },
          { description: { contains: args.topic, mode: 'insensitive' } },
        ];
      }
      const items = await db.knowledgeIndex.findMany({
        where,
        orderBy: [{ hitCount: 'desc' }, { updatedAt: 'desc' }],
        take: 50,
        include: { knowledgeBase: { select: { name: true, type: true, uri: true } } },
      });
      return wrapResult({ count: items.length, items });
    }

    case 'add_comment': {
      requireScope(ctx, 'WRITE_PROJECTS');
      if (!args.targetType || !args.targetId || !args.body) {
        throw withCode(-32602, 'targetType / targetId / body 必填');
      }
      const c = await db.comment.create({
        data: {
          organizationId: ctx.organizationId,
          targetType: args.targetType,
          targetId: args.targetId,
          authorUserId: actor.type === 'HUMAN' ? actor.userId : null,
          authorAgentId: actor.type === 'AGENT' ? actor.agentId : null,
          body: args.body,
          mentions: Array.isArray(args.mentions) ? args.mentions : [],
          replyToId: args.replyToId ?? null,
        },
      });
      await logAudit({ actor, resource: 'Comment', resourceId: c.id, action: 'create', source: 'MCP', diff: { created: c } });
      return wrapResult(c);
    }

    case 'list_comments': {
      requireScope(ctx, 'READ_PROJECTS');
      if (!args.targetType || !args.targetId) throw withCode(-32602, 'targetType / targetId 必填');
      const items = await db.comment.findMany({
        where: {
          organizationId: ctx.organizationId,
          targetType: args.targetType,
          targetId: args.targetId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, name: true, email: true } },
          authorAgent: { select: { id: true, displayName: true } },
        },
      });
      return wrapResult({ count: items.length, items });
    }

    case 'assign_task': {
      requireScope(ctx, 'WRITE_PROJECTS');
      if (!args.targetType || !args.targetId || !args.assigneeUserId) {
        throw withCode(-32602, 'targetType / targetId / assigneeUserId 必填');
      }
      const a = await db.assignment.create({
        data: {
          organizationId: ctx.organizationId,
          targetType: args.targetType,
          targetId: args.targetId,
          assigneeUserId: args.assigneeUserId,
          assignerUserId: actor.type === 'HUMAN' ? actor.userId : null,
          assignerAgentId: actor.type === 'AGENT' ? actor.agentId : null,
          note: args.note ?? null,
          dueAt: args.dueAt ? new Date(args.dueAt) : null,
        },
      });
      await logAudit({ actor, resource: 'Assignment', resourceId: a.id, action: 'create', source: 'MCP', diff: { created: a } });
      return wrapResult(a);
    }

    case 'my_tasks': {
      requireScope(ctx, 'READ_PROJECTS');
      const assigneeUserId = args.assigneeUserId ?? actor.userId ?? ctx.userId;
      const where: any = { organizationId: ctx.organizationId, assigneeUserId };
      if (args.status) where.status = args.status;
      const items = await db.assignment.findMany({
        where,
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
        include: {
          assigner: { select: { id: true, name: true, email: true } },
          assignerAgent: { select: { id: true, displayName: true } },
        },
      });
      return wrapResult({ count: items.length, items });
    }

    case 'request_review': {
      requireScope(ctx, 'WRITE_PROJECTS');
      if (!args.targetType || !args.targetId || !args.reviewerUserId || !args.rationale) {
        throw withCode(-32602, 'targetType / targetId / reviewerUserId / rationale 必填');
      }
      const requesterId = actor.type === 'HUMAN' ? actor.userId : ctx.userId;
      if (!requesterId) throw withCode(-32603, '无法定位 requester user');
      const r = await db.reviewRequest.create({
        data: {
          organizationId: ctx.organizationId,
          targetType: args.targetType,
          targetId: args.targetId,
          fieldName: args.fieldName ?? null,
          currentValue: args.currentValue ?? null,
          proposedValue: args.proposedValue ?? null,
          rationale: args.rationale,
          requesterUserId: requesterId,
          reviewerUserId: args.reviewerUserId,
        },
      });
      await logAudit({ actor, resource: 'ReviewRequest', resourceId: r.id, action: 'create', source: 'MCP', diff: { created: r } });
      await notifyReviewRequest(r);
      return wrapResult(r);
    }

    case 'list_pending_reviews': {
      requireScope(ctx, 'READ_PROJECTS');
      const reviewerUserId = args.reviewerUserId ?? actor.userId ?? ctx.userId;
      const items = await db.reviewRequest.findMany({
        where: { organizationId: ctx.organizationId, reviewerUserId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { id: true, name: true, email: true } },
        },
      });
      return wrapResult({ count: items.length, items });
    }

    default:
      throw withCode(-32601, `Unknown tool: ${name}`);
  }
}

function wrapResult(data: any) {
  // MCP tools/call 协议要求返回 content 数组 + isError 标识
  return {
    content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
    isError: false,
  };
}

function withCode(code: number, message: string): Error {
  const err: any = new Error(message);
  err.code = code;
  return err;
}

/// GB/T 39335 评分 clamp 到 0-4
function clamp04(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(4, Math.round(n)));
}
