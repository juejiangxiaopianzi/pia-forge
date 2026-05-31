/**
 * Seed Demo · 直接套用「猎聘简历数据出境 PIA」第一版 case
 * 跑：npm run db:seed
 * 用途：让任何 fork 这个仓库的人，clone 完一跑就能看到一份真实可参考的 PIA。
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // 0. 清理（仅 dev 用）· 新模型先删
  await db.knowledgeIndex.deleteMany();
  await db.citationLink.deleteMany();
  await db.source.deleteMany();
  await db.knowledgeBase.deleteMany();
  await db.evaluation.deleteMany();
  await db.fieldRevision.deleteMany();
  await db.agentSnapshot.deleteMany();
  await db.apiToken.deleteMany();
  await db.agent.deleteMany();
  await db.auditLog.deleteMany();
  await db.conclusion.deleteMany();
  await db.mitigation.deleteMany();
  await db.risk.deleteMany();
  await db.scenario.deleteMany();
  await db.dataItem.deleteMany();
  await db.piaRole.deleteMany();
  await db.piaProject.deleteMany();
  await db.membership.deleteMany();
  await db.user.deleteMany();
  await db.organization.deleteMany();

  // 1. 组织 & 主用户
  const org = await db.organization.create({
    data: { name: '示例组织 · Liepin', slug: 'demo-liepin', description: '默认 demo 数据，可删可改' },
  });

  const owner = await db.user.create({
    data: {
      email: 'owner@example.com',
      name: '黄越（demo）',
      avatarUrl: null,
    },
  });

  await db.membership.create({
    data: { organizationId: org.id, userId: owner.id, role: 'OWNER' },
  });

  // 2. 评估项目（01 评估总览）
  const project = await db.piaProject.create({
    data: {
      organizationId: org.id,
      code: 'PIA-LP-001',
      title: '猎聘平台简历数据向境外接收方提供',
      scope:
        '本评估覆盖求职者简历从采集→存储→加工→出境→境外接收方使用→销毁的完整数据流；含外资在华、海外IP漂移、真外企、平台推荐通道四大场景。',
      purpose:
        '①支撑数据出境延期申报 ②为承诺函并入用户协议提供合法性背书 ③对应签未签外企的处置策略给出 PIA 结论 ④回应客户对承诺函中敏感个人信息表述的调整诉求',
      legalBases: [
        'PIPL §55-56',
        'PIPL §28（敏感PI）',
        'PIPL §38-43（出境）',
        '数据出境安全评估办法',
        'GB/T 39335-2020 PIA',
        'GB/T 35273-2020 个保规范',
        'GB/T 45574-2025 敏感PI要求',
      ],
      startedAt: new Date('2026-05-26'),
      targetDoneAt: new Date('2026-06-15'),
      leaderId: owner.id,
      teamUserIds: [owner.id],
      overallVerdict: 'IN_PROGRESS',
      residualLevel: 'UNRATED',
      reviewTriggers:
        '①出境量级上升超 20% ②新增出境接收方类型 ③简历字段变更 ④高风险国家新增 ⑤监管法规更新 ⑥数据泄露或权益侵害 ⑦距上次签字满 12 个月',
      version: 'v0.1',
    },
  });

  // 3. 数据信息项（截取 5 个关键项 demo）
  const di_photo = await db.dataItem.create({
    data: {
      projectId: project.id,
      code: 'DI-001',
      name: '简历照片（证件照/头像）',
      techName: 'resume.photo',
      classification: 'DISPUTED',
      sensitiveSub: ['BIOMETRIC'],
      legalBasis: 'SEPARATE_CONSENT',
      legalReasoning:
        '生物识别信息的法定构成要件 = 经技术处理得到的特征模板（GB/T 35273 4.5b + GB/T 45574-2025）。仅持有人脸照片本身（未做特征提取/比对）不构成生物识别信息。本平台不做人脸比对/识别处理，按一般 PI + 等效敏感 PI 保护措施实施。',
      isOutbound: true,
      stages: ['COLLECT', 'STORE', 'OUTBOUND', 'RECEIVER_USE'],
      necessity: '招聘场景身份识别用，应支持求职者选择不提供；不应作为投递必填。',
      status: 'PARTIAL',
      ownerId: owner.id,
      notes: '5/26 派克汉尼汾客户争议关联本字段；建议启动国家级 PIA 备案获权威背书。',
    },
  });

  const di_phone = await db.dataItem.create({
    data: {
      projectId: project.id,
      code: 'DI-002',
      name: '手机号',
      techName: 'resume.phone',
      classification: 'GENERAL',
      sensitiveSub: [],
      legalBasis: 'CONTRACT_NECESSITY',
      legalReasoning: 'GB/T 35273 4.1 通信联系方式。出境环节 PIPL §39 单独同意已通过出境授权弹窗获取。',
      isOutbound: true,
      stages: ['COLLECT', 'STORE', 'OUTBOUND', 'RECEIVER_USE'],
      necessity: '招聘沟通必需，默认隐藏，建立沟通后才暴露。',
      status: 'COMPLIANT',
      ownerId: owner.id,
    },
  });

  const di_intro = await db.dataItem.create({
    data: {
      projectId: project.id,
      code: 'DI-003',
      name: '自我介绍（开放文本）',
      techName: 'resume.self_intro',
      classification: 'GENERAL',
      sensitiveSub: [],
      legalBasis: 'CONTRACT_NECESSITY',
      legalReasoning: 'GB/T 35273 4.1。',
      isOutbound: true,
      stages: ['COLLECT', 'STORE', 'OUTBOUND', 'RECEIVER_USE'],
      necessity: '自填文本可能意外含敏感信息，需加内容过滤提示。',
      status: 'PARTIAL',
      ownerId: owner.id,
    },
  });

  // 4. 场景（demo 2 个核心）
  const sc1 = await db.scenario.create({
    data: {
      projectId: project.id,
      code: 'SC-001',
      name: '真实境外企业招聘 · 出境核心场景',
      description: '真实境外注册企业通过猎聘平台查看境内求职者简历。PIPL §38 意义上的出境核心场景。',
      receiverType: 'TRUE_OVERSEAS',
      receiverRegions: '60+ 国家/地区，以美、日、新、港、英、德、法、澳、加为主。',
      techPath: 'HTTPS over public internet；境外 HR 账号登录平台 → API 拉取简历；部分企业版客户走 SFTP 批量推送。',
      encryption: 'TLS 1.3 全链路加密；身份证默认脱敏；手机号在未建立沟通前默认隐藏。',
      annualVolume: BigInt(1900000),
      shareRatio: '约 19%',
      triggerRules: '招聘方侧：境外 IP 拦截 + 强制承诺函；求职者侧：默认不开放 + 单独同意弹窗。',
      safeguards: '6,829 家已签承诺函；搜索/推荐与查看解耦；接收方账号身份核验。',
      scenarioRisk: '境外司法管辖；接收方使用阶段平台不易留痕。',
      legalBases: ['SEPARATE_CONSENT', 'CONTRACT_NECESSITY'],
      ownerId: owner.id,
      status: 'PARTIAL',
      dataItems: { connect: [{ id: di_photo.id }, { id: di_phone.id }, { id: di_intro.id }] },
    },
  });

  const sc4 = await db.scenario.create({
    data: {
      projectId: project.id,
      code: 'SC-004',
      name: '应签未签外企 · 3,733 家风险敞口',
      description: '已发生境外访问行为、但尚未签署《数据安全承诺函》的外资属性企业，延期申报窗口期内最大合规风险敞口。',
      receiverType: 'FOREIGN_CORP_DOMESTIC',
      receiverRegions: '外资 B/H 标签库覆盖范围。',
      techPath: '同 SC-001。',
      encryption: '技术措施已落地，但缺合同法律层面具结。',
      annualVolume: BigInt(800000),
      shareRatio: '约 12%（估算）',
      triggerRules: '5/31 启动补签通知 → 6/14 第一波清查 → 6/30 强制拦截无章/无标合的全部断访问 · 无特批。',
      safeguards: '技术拦截能力就绪；催签流程已设计；承诺函并入用户协议方案加速签署。',
      scenarioRisk: '若 6/30 前未完成签署/拦截，对监管承诺打折扣；批量断访问对客户运营冲击大。',
      legalBases: ['SEPARATE_CONSENT', 'CONTRACT_NECESSITY'],
      ownerId: owner.id,
      status: 'NON_COMPLIANT',
      dataItems: { connect: [{ id: di_phone.id }] },
    },
  });

  // 5. 风险（demo 3 条核心）
  const r1 = await db.risk.create({
    data: {
      projectId: project.id,
      code: 'R-001',
      name: '简历照片定性争议 · 客户单方判定为生物识别信息致承诺函条款被动调整',
      category: 'LEGAL_BASIS',
      description:
        '客户以人脸特征为由要求平台变更承诺函敏感 PI 表述。本质争议=人脸照片是否构成 PIPL §28 的生物识别信息。',
      likelihood: 4,
      severity: 4,
      legalClauses: 'PIPL §28；§39；GB/T 35273 4.5；GB/T 45574-2025',
      filerId: owner.id,
      strategy: 'MITIGATE',
      dataItems: { connect: [{ id: di_photo.id }] },
      scenarios: { connect: [{ id: sc1.id }, { id: sc4.id }] },
    },
  });

  const r2 = await db.risk.create({
    data: {
      projectId: project.id,
      code: 'R-002',
      name: '3,733 家应签未签外企 · 合同性义务缺失',
      category: 'RECEIVER',
      description:
        '已发生境外访问但未签承诺函的外资属性企业，缺乏评估办法第六条第（五）项要求的具法律效力的法律文件。',
      likelihood: 5,
      severity: 5,
      legalClauses: '数据出境安全评估办法 §6（五）；PIPL §38；§39',
      filerId: owner.id,
      strategy: 'MITIGATE',
      scenarios: { connect: [{ id: sc4.id }] },
    },
  });

  await db.risk.create({
    data: {
      projectId: project.id,
      code: 'R-003',
      name: 'C 端出境告知充分性不足',
      category: 'NOTICE',
      description: '求职者侧出境授权弹窗未充分告知 PIPL §39 要求的接收方名称/目的/方式/权利等五要素。',
      likelihood: 5,
      severity: 4,
      legalClauses: 'PIPL §17；§39；§55-56',
      filerId: owner.id,
      strategy: 'MITIGATE',
      scenarios: { connect: [{ id: sc1.id }] },
    },
  });

  // 6. 控制措施
  await db.mitigation.create({
    data: {
      projectId: project.id,
      code: 'C-001',
      riskId: r1.id,
      name: '简历照片专项 PIA + 国家级 PIA 备案',
      controlType: 'PROCESS',
      details: '单独启动人脸字段子评估，调用国家级机构出具合规判定意见，以国家级背书替代单一企业内部判定。',
      ownerId: owner.id,
      dueAt: new Date('2026-07-15'),
      status: 'NOT_STARTED',
      residualLikelihood: 2,
      residualSeverity: 3,
      acceptable: 'ACCEPTABLE',
      acceptReason: '国家级 PIA 备案后单一客户反对不构成系统性合规风险。',
    },
  });

  await db.mitigation.create({
    data: {
      projectId: project.id,
      code: 'C-003',
      riskId: r2.id,
      name: '3,733 家应签未签外企 · 补签或断访问作战计划（6/30 红线）',
      controlType: 'PROCESS',
      details: '5/31 起补签通知 → 6/14 第一波清查 → 6/30 强制拦截，无特批。',
      ownerId: owner.id,
      dueAt: new Date('2026-06-30'),
      status: 'IMPLEMENTING',
      residualLikelihood: 2,
      residualSeverity: 4,
      acceptable: 'CONDITIONAL',
      acceptReason: '条件 = 6/30 必须完成断访问，不接受继续无限期挂账。',
    },
  });

  // 7. 角色 RACI（demo 3 条）
  await db.piaRole.createMany({
    data: [
      {
        projectId: project.id,
        roleType: 'PIA_LEAD',
        shortLabel: 'PIA 主理人 / 整体审批',
        userId: owner.id,
        organization: '集团安全合规',
        duties: '统筹整个 PIA 流程；裁决信息项定性争议；审定风险评级；签署最终结论。',
        raciFlags: ['R', 'A'],
        stages: ['S0_SCOPE', 'S1_DATAFLOW', 'S2_IDENTIFY', 'S3_RATE', 'S4_MITIGATE', 'S5_REPORT'],
        deliverable: 'PIA 报告 v1.0 终稿 + 签字页 + 复评计划',
        dueAt: new Date('2026-06-15'),
        status: 'IN_PROGRESS',
      },
      {
        projectId: project.id,
        roleType: 'LEGAL_LEAD',
        shortLabel: '法务 / 合法性论证',
        organization: '集团法务',
        duties:
          '对合法性基础、合同条款、第三方受益人、签署强度等效性给出法律意见。在 PIA 内不承担敏感 PI 事实定性裁判权。',
        raciFlags: ['R', 'C'],
        stages: ['S0_SCOPE', 'S2_IDENTIFY', 'S4_MITIGATE', 'S5_REPORT'],
        deliverable: '合法性基础论证文档 + 承诺函并入用户协议合规意见',
        dueAt: new Date('2026-06-10'),
        status: 'NOT_STARTED',
      },
      {
        projectId: project.id,
        roleType: 'EXEC_APPROVER',
        shortLabel: 'CTO / 高管签字',
        organization: '集团高管',
        duties: '对 PIA 整体结论与残余风险接受决定做最终签字。',
        raciFlags: ['A'],
        stages: ['S5_REPORT'],
        deliverable: 'PIA 报告签字页',
        dueAt: new Date('2026-06-18'),
        status: 'NOT_STARTED',
      },
    ],
  });

  // 8. 结论 v0.1
  await db.conclusion.create({
    data: {
      projectId: project.id,
      title: 'v0.1 首版评估结论草稿',
      evaluationTarget: '猎聘平台简历数据向境外接收方提供（含 4 大真实场景）',
      overallVerdict:
        '在采取本 PIA 提出的 14 项控制措施后，整体残余风险可降至「中」并具备可接受条件。最高风险点 = SC-004 + R-002（3,733 家应签未签外企）。',
      residualLevel: 'MEDIUM',
      highRiskSummary: 'R-002 3,733 家应签未签必须 6/30 前补签或断访问；R-003 C 端告知充分性 6/15 前完成。',
      businessAdvice: 'B 端 6/30 拦截不接受妥协；C 端弹窗按 PIPL §39 五要素重构；数据团队拆解 1000 万口径。',
      regulatorTone:
        '平台已主动启动 PIA · 已识别 10 项风险并配套 14 项控制措施 · 对 3,733 家制定补签或断访问计划。',
      signerRoleLabel: '集团安全合规总监 · PIA 主理人',
      signerId: owner.id,
      nextReviewAt: new Date('2027-05-26'),
      reviewTriggers: '7 项触发条件或 12 个月节点。',
      reviewerId: owner.id,
      state: 'DRAFT',
    },
  });

  // 9. 给 AUDIT module 一个 demo 项目（让用户看到平台感）
  await db.piaProject.create({
    data: {
      organizationId: org.id,
      assessmentType: 'AUDIT',
      code: 'AUDIT-Q2-001',
      title: '示例 · 子公司合规审计（Q2）',
      scope: 'demo 数据 · 子公司业务合规检查 · 审计周期 2026 Q2',
      purpose: '示范 AUDIT module 复用底座的能力。所有字段与 PIA module 相同 schema，UI 上按 module 翻译标签。',
      legalBases: ['网安法', '数安法', '等保 2.0', '60 号文'],
      startedAt: new Date('2026-04-01'),
      targetDoneAt: new Date('2026-06-30'),
      leaderId: owner.id,
      reviewTriggers: '季度审计周期',
      version: 'v0.1',
    },
  });

  // 10. demo Agent（黄越的 Claude Code）· 系统颁发身份
  const demoAgent = await db.agent.create({
    data: {
      organizationId: org.id,
      ownerId: owner.id,
      displayName: '黄越的 Claude Code',
      description: '用于 PIA 风险起草、合规判断辅助。装了 pia-forge skill pack。',
      status: 'ACTIVE',
    },
  });

  // demo Agent 的初始 snapshot
  await db.agentSnapshot.create({
    data: {
      agentId: demoAgent.id,
      version: 'v1.0',
      changeNotes: '首版 · prompt 自 skills/pia-forge/SKILL.md · 模型 claude-sonnet-4.6',
    },
  });

  // 10.5 知识库 + Source · 公共知识库(法规等)和个人 KB(GitHub Private)统一两层模型
  // ─ KnowledgeBase = 一个来源/物理位置
  // ─ Source = 该来源下的一条具体内容(法规条款 / 文档 / 客户沟通纪要)
  //   Source.body 是缓存的 markdown 全文,供系统内预览

  // KB1 · PIPL 官方原文(公网公报)· 公共
  const kbPipl = await db.knowledgeBase.create({
    data: {
      organizationId: org.id,
      name: 'PIPL · 个人信息保护法 · 官方公报',
      description: '国务院公报公布版本 · 公共法规 · 全员可引用',
      type: 'URL_LIST',
      uri: 'https://www.gov.cn/xinwen/2021-08/20/content_5632486.htm',
      scope: 'ORG',
      ownerUserId: owner.id,
      syncStrategy: 'Agent skill(legal-ingest) 周期抓取',
    },
  });

  // KB2 · 国家标准(GB/T) · 公共
  const kbGB = await db.knowledgeBase.create({
    data: {
      organizationId: org.id,
      name: '国家标准 · GB/T 系列',
      description: '国家标准全文公开系统抓取 + 部分需购买的国标手动上传 markdown',
      type: 'URL_LIST',
      uri: 'https://openstd.samr.gov.cn/',
      scope: 'ORG',
      ownerUserId: owner.id,
      syncStrategy: 'Agent skill 抓取 + 手动上传',
    },
  });

  // KB3 · 数据出境评估办法 · 公共
  const kbExport = await db.knowledgeBase.create({
    data: {
      organizationId: org.id,
      name: '数据出境安全评估办法 + 配套规则',
      description: '网信办公网 + 标准合同备案规则等',
      type: 'URL_LIST',
      uri: 'https://www.cac.gov.cn/',
      scope: 'ORG',
      ownerUserId: owner.id,
      syncStrategy: 'Agent skill 抓取',
    },
  });

  // KB4 · 黄越的合规知识库(GitHub Private)· 私有解读
  const kbGithub = await db.knowledgeBase.create({
    data: {
      organizationId: org.id,
      name: '黄越的合规知识库(GitHub 私有)',
      description: 'huangyue-compliance-kb · 个人解读 + 案例 + 公司口径 · 私有 · 仅本人 Agent 可读',
      type: 'GITHUB_REPO',
      uri: 'juejiangxiaopianzi/huangyue-compliance-kb',
      scope: 'PRIVATE',
      ownerUserId: owner.id,
      syncStrategy: '本地 Agent skill 写入后 git push',
    },
  });

  // KB5 · 飞书部门 wiki · 团队级
  const kbFeishu = await db.knowledgeBase.create({
    data: {
      organizationId: org.id,
      name: '猎聘安全合规中心(飞书)',
      description: '部门内部 wiki · 团队可见 · 录入飞书地址后由 PIA Forge 同步过来缓存',
      type: 'FEISHU_SPACE',
      uri: '7074424220893085697',
      scope: 'TEAM',
      ownerUserId: owner.id,
      syncStrategy: '飞书 OAuth 同步(待接)',
    },
  });

  // Source 数据 · 每条都带 body markdown 供系统内预览
  const src_pipl_28 = await db.source.create({
    data: {
      organizationId: org.id,
      knowledgeBaseId: kbPipl.id,
      type: 'URL',
      uri: 'https://www.gov.cn/xinwen/2021-08/20/content_5632486.htm#§28',
      title: 'PIPL §28 · 敏感个人信息定义',
      tags: ['敏感个人信息', '定义', '生物识别', '§28'],
      body: `# 中华人民共和国个人信息保护法 §28

## 第二十八条 敏感个人信息

**敏感个人信息**是一旦泄露或者非法使用，容易导致自然人的人格尊严受到侵害或者人身、财产安全受到危害的个人信息，包括:

- 生物识别
- 宗教信仰
- 特定身份
- 医疗健康
- 金融账户
- 行踪轨迹

等信息，以及不满十四周岁未成年人的个人信息。

只有在具有特定的目的和充分的必要性，并采取严格保护措施的情形下，个人信息处理者方可处理敏感个人信息。

---

> 版本: 2021-11-01 施行 · 来源: 国务院公报 · 系统启动时由 Agent skill (\`legal-ingest\`) 抓取入库`,
      excerpt: '敏感 PI 定义 + 生物识别/特定身份/医疗等子类型 + 14 岁未成年人',
      capturedByActorType: 'AGENT',
      capturedByAgentId: demoAgent.id,
      scope: 'ORG',
      projectId: null,
    },
  });

  const src_pipl_39 = await db.source.create({
    data: {
      organizationId: org.id,
      knowledgeBaseId: kbPipl.id,
      type: 'URL',
      uri: 'https://www.gov.cn/xinwen/2021-08/20/content_5632486.htm#§39',
      title: 'PIPL §39 · 出境告知 + 单独同意',
      tags: ['出境', '告知', '单独同意', '§39'],
      body: `# PIPL §39 · 向境外提供个人信息

## 第三十九条

个人信息处理者向中华人民共和国境外提供个人信息的，应当**向个人告知**境外接收方的:

1. 名称或者姓名
2. 联系方式
3. 处理目的
4. 处理方式
5. 个人信息的种类
6. 个人向境外接收方行使本法规定权利的方式和程序

等事项，并取得**个人的单独同意**。

---

## 实务影响

- 出境授权弹窗必须明列接收方五要素
- "单独同意" 不能与一般注册协议混合
- 接收方变更需重新告知`,
      excerpt: '出境告知五要素 + 单独同意 · 不能混入注册协议',
      capturedByActorType: 'AGENT',
      capturedByAgentId: demoAgent.id,
      scope: 'ORG',
      projectId: null,
    },
  });

  const src_pipl_55 = await db.source.create({
    data: {
      organizationId: org.id,
      knowledgeBaseId: kbPipl.id,
      type: 'URL',
      uri: 'https://www.gov.cn/xinwen/2021-08/20/content_5632486.htm#§55-56',
      title: 'PIPL §55-56 · PIA 触发条件 + 内容 + 留痕 3 年',
      tags: ['PIA', '触发条件', '留痕'],
      body: `# PIPL §55-56 · 个人信息保护影响评估

## §55 · 应当进行 PIA 的五类情形

个人信息处理者有下列情形之一的，应当事前进行个人信息保护影响评估:

1. 处理敏感个人信息
2. 利用个人信息进行自动化决策
3. 委托处理 / 共享 / 公开个人信息
4. 向境外提供个人信息
5. 其他对个人权益有重大影响的处理活动

## §56 · PIA 内容 + 留痕 ≥ 3 年

个人信息保护影响评估应当包括下列内容:

- 处理目的、方式等是否合法、正当、必要
- 对个人权益的影响及安全风险
- 所采取的保护措施是否合法、有效并与风险程度相适应

**报告和处理情况记录应当至少保存三年。**`,
      excerpt: 'PIA 触发 5 类 + 必含 3 项 + 留痕 ≥ 3 年',
      capturedByActorType: 'AGENT',
      capturedByAgentId: demoAgent.id,
      scope: 'ORG',
      projectId: null,
    },
  });

  const src_gb_35273 = await db.source.create({
    data: {
      organizationId: org.id,
      knowledgeBaseId: kbGB.id,
      type: 'URL',
      uri: 'https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=4568F276E0F8346EB0FBA097AA0CE05E',
      title: 'GB/T 35273-2020 · 个人信息安全规范 · 4.5 敏感 PI',
      tags: ['国标', '敏感 PI', '4.5b 生物识别', 'GB/T 35273'],
      body: `# GB/T 35273-2020 · 信息安全技术 个人信息安全规范

## 4.5 敏感个人信息(节选)

包括以下子类型:

- **4.5a** 个人财产信息
- **4.5b** 个人健康生理信息
- **4.5c** 个人生物识别信息 — 包括**经过技术处理得到的**个人基因、指纹、声纹、掌纹、耳廓、虹膜、面部识别**特征**等
- **4.5d** 个人身份信息
- **4.5e** 网络身份标识信息
- ...

## 关键边界

> 「**经过技术处理得到的特征**」 — 这一限定是判断"是否构成生物识别信息"的法定要件之一。
> 仅持有原始照片(未做特征提取/比对/向量化)不直接构成生物识别信息。`,
      excerpt: '4.5b 生物识别 = "经技术处理得到的特征" · 仅持照片不构成',
      capturedByActorType: 'AGENT',
      capturedByAgentId: demoAgent.id,
      scope: 'ORG',
      projectId: null,
    },
  });

  const src_gb_45574 = await db.source.create({
    data: {
      organizationId: org.id,
      knowledgeBaseId: kbGB.id,
      type: 'URL',
      uri: 'https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=GBT45574',
      title: 'GB/T 45574-2025 · 敏感个人信息处理安全要求',
      tags: ['国标 2025', '敏感 PI', 'GB/T 45574'],
      body: `# GB/T 45574-2025 · 数据安全技术 敏感个人信息处理安全要求

## 概述

2025 年发布的新国标,针对敏感个人信息处理给出了更细化的:

- 处理规则(收集、存储、使用、共享、转移、公开、删除)
- 技术要求(分类分级、加密、脱敏、访问控制)
- 生物识别**构成要件**的进一步细化

## 关键澄清

延续 GB/T 35273-2020 的「经技术处理得到的特征模板」要件,并进一步:

- 明确未做特征提取的人脸照片不当然构成生物识别
- 强调用途绑定 - 同一字段在不同场景下定性可不同

---

> 状态: 2025 年发布 · 取代部分 GB/T 35273 章节`,
      excerpt: '2025 新国标 · 进一步细化敏感 PI 构成要件 · 强调用途绑定',
      capturedByActorType: 'AGENT',
      capturedByAgentId: demoAgent.id,
      scope: 'ORG',
      projectId: null,
    },
  });

  const src_export_5 = await db.source.create({
    data: {
      organizationId: org.id,
      knowledgeBaseId: kbExport.id,
      type: 'URL',
      uri: 'https://www.cac.gov.cn/2022-07/07/c_1658811536396503.htm#§5',
      title: '数据出境安全评估办法 §5 · 自评估必备内容',
      tags: ['出境', '自评估', '评估办法 §5'],
      body: `# 数据出境安全评估办法 §5

数据处理者在出境前应当开展数据出境**风险自评估**,重点评估下列事项:

1. 数据出境的**合法性、正当性、必要性**
2. 境外接收方所在国家或地区的**数据安全保护政策法规**和网络安全环境
3. 数据出境的规模、范围、种类、敏感程度
4. 可能对国家安全、公共利益、个人或组织合法权益的风险
5. 与境外接收方拟订立的法律文件中是否充分约定了数据安全保护责任义务
6. 数据出境中及出境后的环节是否存在被篡改、破坏、泄露、丢失、转移或者被非法获取、非法利用等风险
7. 监管机构发现的其他风险

---

> 关键: §5(五)要求与境外接收方约定的法律文件 → 这是「应签未签外企」风险的法定依据`,
      excerpt: '自评估 7 项 + 第五项 = 应签未签外企风险的法定依据',
      capturedByActorType: 'AGENT',
      capturedByAgentId: demoAgent.id,
      scope: 'ORG',
      projectId: null,
    },
  });

  // 私有 KB · 解读
  const src_interp_photo = await db.source.create({
    data: {
      organizationId: org.id,
      knowledgeBaseId: kbGithub.id,
      type: 'GITHUB_FILE',
      uri: 'github://juejiangxiaopianzi/huangyue-compliance-kb/interpretations/pipl/§28-照片是否构成生物识别.md@c4047c3',
      title: '【我的解读】PIPL §28 · 简历照片是否构成生物识别',
      tags: ['解读', '案例', '简历照片', 'PIPL §28'],
      body: `# 我对 PIPL §28 + GB/T 35273 4.5b 的统一口径

## 结论

**仅持有简历照片,未做特征提取/向量化/比对的,不构成生物识别信息。** 按一般 PI + 等效敏感 PI 保护措施实施即可。

## 法定要件三段论

1. PIPL §28 列举了生物识别为敏感 PI 子类型
2. GB/T 35273 4.5b 限定了"**经过技术处理得到的**…特征"
3. GB/T 45574-2025 延续要件并强调"用途绑定"

## 公司当前实施口径

| 字段 | 用途 | 是否生物识别 |
|------|------|--------------|
| 简历照片(头像) | 招聘方人工查看身份 | 否 |
| 求职者上传的指纹打卡数据 | 排除 | 是 |
| 视频面试录像 | 仅存档,不做特征比对 | 否 |
| 后续若上线 AI 视频面评 | 做了情绪/表情特征向量 | **是** ⚠️ |

## 反方论点(留底)

- 派克汉尼汾客户 2026-05-26 主张文义解释应从宽 → 我方驳: 国标已明确要件,不应单一客户主张推翻国标
- 监管层面: 建议启动国家级 PIA 备案获权威背书,降低单一客户反对的风险

---

> 解读者: 黄越 · 最后更新 2026-05-31 · 引用源: PIPL §28 / GB/T 35273 4.5b / GB/T 45574-2025`,
      excerpt: '我对照片定性的统一口径 + 公司实施表 + 反方驳论',
      capturedByActorType: 'AGENT',
      capturedByAgentId: demoAgent.id,
      scope: 'PRIVATE',
      projectId: null,
    },
  });

  const src_interp_outbound = await db.source.create({
    data: {
      organizationId: org.id,
      knowledgeBaseId: kbGithub.id,
      type: 'GITHUB_FILE',
      uri: 'github://juejiangxiaopianzi/huangyue-compliance-kb/interpretations/pipl/§39-出境告知五要素工程实施.md@c4047c3',
      title: '【我的解读】PIPL §39 · 出境告知五要素的工程实施',
      tags: ['解读', '出境', 'PIPL §39', 'C 端弹窗'],
      body: `# PIPL §39 五要素在 C 端弹窗的工程化口径

## 五要素 vs 当前弹窗

| §39 要素 | 当前实现 | 缺口 |
|---------|---------|------|
| 接收方名称/姓名 | ❌ 仅"境外招聘方" | 必须列具名公司 |
| 联系方式 | ❌ 无 | 提供接收方 DPO 邮箱 |
| 处理目的 | ✅ "招聘沟通" | OK |
| 处理方式 | ❌ 笼统 | 须列存储+查阅+导出 |
| 信息种类 | ⚠️ 部分 | 列具体字段名 |
| 行使权利方式 | ❌ 无 | 接收方侧投诉/删除路径 |

## 短期方案

- 在统一出境弹窗里加 5 要素折叠区
- 接收方名称从「合作企业库」实时拉
- 单独同意按钮 vs 整体注册分开

## 长期方案

考虑做接收方分类: 已签承诺函企业一组 prompt,未签企业另一组(优先催签)`,
      excerpt: '§39 五要素工程实施对照表 + 短期/长期方案',
      capturedByActorType: 'AGENT',
      capturedByAgentId: demoAgent.id,
      scope: 'PRIVATE',
      projectId: null,
    },
  });

  // 飞书部门 wiki · 内部沟通纪要
  const src_feishu_pkr = await db.source.create({
    data: {
      organizationId: org.id,
      knowledgeBaseId: kbFeishu.id,
      type: 'FEISHU_DOC',
      uri: 'feishu://docx/CuKGd02KAobmVuxG9LLcxpr7nqc',
      title: '5/26 派克汉尼汾客户沟通纪要',
      tags: ['客户沟通', '案例', '简历照片争议'],
      body: `# 派克汉尼汾客户沟通纪要 · 2026-05-26

## 出席方
- 客户: 派克汉尼汾(中国)法务 1 人 + 数据保护负责人 1 人
- 我方: 黄越 + 法务 cherry + 商务对接

## 客户诉求

客户**单方主张**简历照片构成生物识别信息,要求平台:
1. 修改承诺函中关于敏感 PI 的表述
2. 单独同意流程对照片单列

## 我方立场

- 引用 GB/T 35273 4.5b + GB/T 45574-2025 说明法定要件
- 同意启动国家级 PIA 备案获权威背书
- 不接受单一客户主张推翻国标解释

## 待办

- [ ] 启动国家级 PIA 备案
- [ ] 准备一份正式法律意见函

> 同步到: PIA-LP-001 / R-001 简历照片定性争议`,
      excerpt: '客户主张照片=生物识别 · 我方引国标驳论 · 启动国家级 PIA 备案',
      capturedByActorType: 'HUMAN',
      capturedByUserId: owner.id,
      scope: 'TEAM',
      projectId: project.id,
    },
  });

  // 引用关系: R-001 → 4 个 Source
  await db.citationLink.createMany({
    data: [
      {
        fromType: 'Risk',
        fromId: r1.id,
        toSourceId: src_pipl_28.id,
        citationType: 'EVIDENCE',
        excerpt: 'PIPL §28 是敏感 PI 定义的源法条',
        citedByActorType: 'AGENT',
        citedByAgentId: demoAgent.id,
      },
      {
        fromType: 'Risk',
        fromId: r1.id,
        toSourceId: src_gb_35273.id,
        citationType: 'EVIDENCE',
        excerpt: 'GB/T 35273 4.5b 明确"经技术处理得到的特征"要件,仅持原始照片不构成',
        citedByActorType: 'AGENT',
        citedByAgentId: demoAgent.id,
      },
      {
        fromType: 'Risk',
        fromId: r1.id,
        toSourceId: src_interp_photo.id,
        citationType: 'DERIVED_FROM',
        excerpt: '本风险的判定逻辑直接基于我的解读口径',
        citedByActorType: 'AGENT',
        citedByAgentId: demoAgent.id,
      },
      {
        fromType: 'Risk',
        fromId: r1.id,
        toSourceId: src_feishu_pkr.id,
        citationType: 'DISCUSSED_IN',
        excerpt: '客户提出争议的原始沟通记录',
        citedByActorType: 'HUMAN',
        citedByUserId: owner.id,
      },
    ],
  });
  // 11. (已并入上方 10.5 段 · 移除旧 LegalReference 模型)
  /*
  // 旧法规库种子(LegalReference 表已删除) · 保留注释作为历史
  const initialLaws: Array<{
    code: string;
    title: string;
    body: string;
    source: string;
    tags: string[];
    applicableModules: Array<'PIA' | 'AUDIT' | 'FILING' | 'NOTICE' | 'INCIDENT'>;
    officialUrl?: string;
    version?: string;
  }> = [
    {
      code: 'PIPL §55',
      title: '应当进行个人信息保护影响评估的五类情形',
      body:
        '处理敏感个人信息；利用个人信息进行自动化决策；委托处理 / 共享 / 公开个人信息；向境外提供个人信息；其他对个人权益有重大影响的处理活动。',
      source: 'PIPL',
      tags: ['PIA 触发条件', '敏感个人信息', '出境', '自动化决策'],
      applicableModules: ['PIA'],
      version: '2021-11-01',
      officialUrl: 'https://www.gov.cn/xinwen/2021-08/20/content_5632486.htm',
    },
    {
      code: 'PIPL §56',
      title: 'PIA 必含内容 + 留痕 ≥ 3 年',
      body:
        '处理目的、方式等是否合法、正当、必要；对个人权益的影响及安全风险；所采取的保护措施是否合法、有效并与风险程度相适应。报告和处理情况记录应当至少保存三年。',
      source: 'PIPL',
      tags: ['PIA 内容要求', '留痕', '3 年'],
      applicableModules: ['PIA'],
      version: '2021-11-01',
    },
    {
      code: '评估办法 §5',
      title: '数据出境安全自评估必备内容',
      body:
        '数据出境的合法性、正当性、必要性；境外接收方所在国家或地区的数据安全保护政策法规和网络安全环境；数据出境的规模、范围、种类、敏感程度，可能对国家安全、公共利益、个人或组织合法权益的风险等。',
      source: '数据出境安全评估办法',
      tags: ['出境', '自评估'],
      applicableModules: ['FILING', 'PIA'],
      version: '2022-09-01',
    },
    {
      code: 'PIPL §28',
      title: '敏感个人信息定义',
      body:
        '一旦泄露或者非法使用，容易导致自然人的人格尊严受到侵害或者人身、财产安全受到危害的个人信息，包括生物识别、宗教信仰、特定身份、医疗健康、金融账户、行踪轨迹等信息，以及不满十四周岁未成年人的个人信息。',
      source: 'PIPL',
      tags: ['敏感个人信息', '定义'],
      applicableModules: ['PIA', 'NOTICE', 'AUDIT'],
      version: '2021-11-01',
    },
    {
      code: 'PIPL §39',
      title: '向境外提供个人信息的告知 + 单独同意',
      body:
        '应当向个人告知境外接收方的名称或者姓名、联系方式、处理目的、处理方式、个人信息的种类以及个人向境外接收方行使本法规定权利的方式和程序等事项，并取得个人的单独同意。',
      source: 'PIPL',
      tags: ['出境', '告知', '单独同意'],
      applicableModules: ['PIA', 'FILING', 'NOTICE'],
      version: '2021-11-01',
    },
    {
      code: 'GB/T 39335-2020',
      title: '信息安全技术 个人信息安全影响评估指南',
      body:
        '国家标准 · PIA 方法论。包含评估范围确定、风险识别、风险分析评价、报告编写四个步骤。本系统的字段设计与此对齐。',
      source: 'GB/T 39335',
      tags: ['国家标准', 'PIA 方法论'],
      applicableModules: ['PIA'],
      version: '2020',
    },
    {
      code: 'GB/T 35273-2020',
      title: '信息安全技术 个人信息安全规范',
      body:
        '4.5 节明确列举敏感个人信息子类型，含生物识别信息（4.5b）。本系统的「敏感子类型」枚举来源。',
      source: 'GB/T 35273',
      tags: ['国家标准', '敏感子类型'],
      applicableModules: ['PIA', 'AUDIT'],
      version: '2020',
    },
    {
      code: 'GB/T 45574-2025',
      title: '数据安全技术 敏感个人信息处理安全要求',
      body: '2025 年新国标，对敏感 PI 处理规则、技术要求、生物识别构成要件做出进一步细化。',
      source: 'GB/T 45574',
      tags: ['国家标准', '敏感 PI', '2025 新国标'],
      applicableModules: ['PIA', 'AUDIT'],
      version: '2025',
    },
  ];

  // 旧 LegalReference seed 结束
  */

  // 13. 知识索引 · "Agent 知道这事在哪/找谁问"的最小路由
  await db.knowledgeIndex.createMany({
    data: [
      {
        organizationId: org.id,
        knowledgeBaseId: kbGithub.id,
        topic: '数据出境延期申报',
        description: '数据出境申报相关的论证文档、口径稿、申报内容都在这',
        pointers: JSON.stringify([
          { type: 'KB', id: kbGithub.id, hint: '搜 docs/ 下含「出境申报」「延期」关键词' },
          { type: 'SOURCE', id: src_export_5.id },
          { type: 'SOURCE', id: src_pipl_39.id },
          { type: 'SOURCE', id: src_interp_outbound.id },
        ]),
        ownerUserId: owner.id,
        scope: 'PRIVATE',
      },
      {
        organizationId: org.id,
        knowledgeBaseId: kbGithub.id,
        topic: '简历照片定性争议',
        description: '人脸/生物识别相关的判定论证全集',
        pointers: JSON.stringify([
          { type: 'KB', id: kbGithub.id, hint: '搜 docs/ 下含「人脸」「生物识别」' },
          { type: 'SOURCE', id: src_gb_35273.id },
          { type: 'SOURCE', id: src_gb_45574.id },
          { type: 'SOURCE', id: src_interp_photo.id },
          { type: 'SOURCE', id: src_feishu_pkr.id },
        ]),
        ownerUserId: owner.id,
        scope: 'PRIVATE',
      },
      {
        organizationId: org.id,
        topic: '应签未签外企 3,733 家清单',
        description: '清单维护 + 6/30 红线作战计划',
        pointers: JSON.stringify([
          { type: 'KB', id: kbGithub.id, hint: '搜「应签未签」「3733」「6/30 红线」' },
          { type: 'SOURCE', id: src_export_5.id },
          { type: 'AGENT', hint: '黄越本人 + 集团法务最终拍板' },
        ]),
        ownerUserId: owner.id,
        scope: 'PRIVATE',
      },
    ],
  });

  // 14. demo API Token，绑定到 Agent（不只是 user）
  const { generateApiToken } = await import('../lib/api-auth');
  const { plaintext, prefix, hashed } = generateApiToken();
  await db.apiToken.create({
    data: {
      organizationId: org.id,
      userId: owner.id,
      agentId: demoAgent.id,
      name: 'demo · 给黄越的 Claude Code 用',
      prefix,
      hashedToken: hashed,
      scopes: ['ADMIN'],
    },
  });

  console.log('');
  console.log('====================================================================');
  console.log('  Seed 完成');
  console.log('====================================================================');
  console.log('Org:        ', org.slug);
  console.log('PIA Project:', project.code, project.title);
  console.log('AUDIT demo: AUDIT-Q2-001');
  console.log('');
  console.log('Demo Agent (系统颁发的身份码):');
  console.log('  ', demoAgent.id, '·', demoAgent.displayName);
  console.log('');
  console.log('Demo API Token (绑定到上面 Agent · 仅此一次显示):');
  console.log('  ', plaintext);
  console.log('');
  console.log('  REST API 健康检查:');
  console.log('    curl http://localhost:3000/api/v1/health -H "Authorization: Bearer ' + plaintext + '"');
  console.log('  MCP 元信息:');
  console.log('    curl http://localhost:3000/api/mcp -H "Authorization: Bearer ' + plaintext + '"');
  console.log('====================================================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
