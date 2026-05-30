/**
 * Module-aware 标签翻译
 * PIA / AUDIT / FILING / NOTICE / INCIDENT 共用底层 schema，
 * 但 UI 上各自的术语不同。本模块提供统一的翻译表，所有页面通过 labelsFor(type) 取标签。
 */

import type { AssessmentType } from '@prisma/client';

export type ModuleLabels = {
  module: string;
  modulesDesc: string;
  dataItem: { singular: string; plural: string };
  scenario: { singular: string; plural: string };
  risk: { singular: string; plural: string };
  mitigation: { singular: string; plural: string };
  conclusion: { singular: string; plural: string };
  reportTitle: string;
  accent: string;
};

const LABELS: Record<AssessmentType, ModuleLabels> = {
  PIA: {
    module: 'PIA',
    modulesDesc: '个人信息保护影响评估',
    dataItem: { singular: '信息项', plural: '信息项清单' },
    scenario: { singular: '出境场景', plural: '出境场景清单' },
    risk: { singular: '风险', plural: '风险登记册' },
    mitigation: { singular: '控制措施', plural: '控制措施与残余风险' },
    conclusion: { singular: '评估结论', plural: '结论与签字' },
    reportTitle: 'PIA 报告',
    accent: 'violet',
  },
  AUDIT: {
    module: 'Audit',
    modulesDesc: '合规审计',
    dataItem: { singular: '控制点', plural: '控制点清单' },
    scenario: { singular: '审计范围', plural: '审计范围与业务流程' },
    risk: { singular: '审计发现', plural: '审计发现清单' },
    mitigation: { singular: '整改项', plural: '整改项与验证' },
    conclusion: { singular: '审计意见', plural: '审计意见与签字' },
    reportTitle: '审计报告',
    accent: 'blue',
  },
  FILING: {
    module: 'Filing',
    modulesDesc: '申报与备案台账',
    dataItem: { singular: '申报字段', plural: '申报字段清单' },
    scenario: { singular: '申报路径', plural: '申报路径与材料' },
    risk: { singular: '申报缺陷', plural: '申报缺陷与争议点' },
    mitigation: { singular: '补正动作', plural: '补正动作与材料补强' },
    conclusion: { singular: '申报版本', plural: '申报版本与回函' },
    reportTitle: '申报材料汇编',
    accent: 'teal',
  },
  NOTICE: {
    module: 'Notice',
    modulesDesc: '告知与同意版本管理',
    dataItem: { singular: '告知要素', plural: '告知要素清单' },
    scenario: { singular: '告知场景', plural: '告知场景与触发条件' },
    risk: { singular: '告知不充分点', plural: '告知不充分点登记' },
    mitigation: { singular: '改版动作', plural: '改版动作与生效' },
    conclusion: { singular: '政策版本', plural: '政策版本与生效记录' },
    reportTitle: '隐私政策审阅报告',
    accent: 'amber',
  },
  INCIDENT: {
    module: 'Incident',
    modulesDesc: '事件响应',
    dataItem: { singular: '涉及数据', plural: '事件涉及数据清单' },
    scenario: { singular: '事件场景', plural: '事件复盘场景' },
    risk: { singular: '影响维度', plural: '影响维度评估' },
    mitigation: { singular: '处置动作', plural: '处置动作与时间线' },
    conclusion: { singular: '处置报告', plural: '处置报告与对外口径' },
    reportTitle: '事件处置报告',
    accent: 'rose',
  },
};

export function labelsFor(type: AssessmentType): ModuleLabels {
  return LABELS[type] ?? LABELS.PIA;
}

export const ALL_MODULE_TYPES: AssessmentType[] = ['PIA', 'AUDIT', 'FILING', 'NOTICE', 'INCIDENT'];
