/**
 * Seed Demo · 直接套用「猎聘简历数据出境 PIA」第一版 case
 * 跑：npm run db:seed
 * 用途：让任何 fork 这个仓库的人，clone 完一跑就能看到一份真实可参考的 PIA。
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // 0. 清理（仅 dev 用）
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

  console.log('✅ Seed 完成');
  console.log('Org:', org.slug);
  console.log('Project:', project.code, project.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
