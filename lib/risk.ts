/**
 * 风险评级 · 共享计算工具
 *
 * 两套口径并存：
 * 1) 旧口径(兼容)：value = likelihood × severity；≥15=高，8-14=中，1-7=低
 * 2) GB/T 39335-2020 国标口径：影响 0-4 × 可能性 0-4 → 表 D.5 矩阵
 */
import type { RiskLevel } from '@prisma/client';

export function riskValue(likelihood: number | null | undefined, severity: number | null | undefined): number | null {
  if (!likelihood || !severity) return null;
  return likelihood * severity;
}

export function riskLevelOf(value: number | null): RiskLevel {
  if (value == null) return 'UNRATED';
  if (value >= 15) return 'HIGH';
  if (value >= 8) return 'MEDIUM';
  if (value >= 1) return 'LOW';
  return 'UNRATED';
}

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  UNRATED: '未评',
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
};

export const RISK_LEVEL_COLOR: Record<RiskLevel, string> = {
  UNRATED: 'bg-gray-200 text-gray-700',
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-700',
};

// ────────────────────────────────────────────────────────────────────────
// GB/T 39335-2020 国标 · 影响 4 维 / 可能性 4 因素 / 综合矩阵
// ────────────────────────────────────────────────────────────────────────

/// 等级 label(国标 0-4)
/// 0=无 / 1=低 / 2=中 / 3=高 / 4=严重(对应国标"严重")
export const GBT_SCORE_LABEL: Record<number, string> = {
  0: '无',
  1: '低',
  2: '中',
  3: '高',
  4: '严重',
};

/// 等级配色 (semantic chip · 不含 emoji)
/// 0=slate 1=emerald 2=amber 3=orange 4=red
export const GBT_SCORE_COLOR: Record<number, string> = {
  0: 'bg-slate-200 text-slate-600',
  1: 'bg-emerald-200 text-emerald-800',
  2: 'bg-amber-200 text-amber-800',
  3: 'bg-orange-300 text-orange-900',
  4: 'bg-red-500 text-white',
};

/// 4 维权益影响维度
export const IMPACT_DIMENSIONS = [
  { key: 'impactDecide', label: '限制个人自主决定权', short: '决定权' },
  { key: 'impactDiscriminate', label: '引发差别性待遇', short: '差别待遇' },
  { key: 'impactReputation', label: '名誉受损或精神压力', short: '名誉/精神' },
  { key: 'impactProperty', label: '人身财产受损', short: '人身财产' },
] as const;

/// 4 因素安全事件可能性
export const LIKELIHOOD_FACTORS = [
  { key: 'factorNetwork', label: '网络环境和技术措施', short: '网络技术' },
  { key: 'factorProcess', label: '个人信息处理流程', short: '处理流程' },
  { key: 'factorPersonnel', label: '参与人员与第三方', short: '人员/第三方' },
  { key: 'factorBusiness', label: '业务特点和规模及安全态势', short: '业务态势' },
] as const;

/// 取 4 维 max 作为综合(国标允许加权,默认 max 最保守)
export function maxOf4(a?: number | null, b?: number | null, c?: number | null, d?: number | null): number {
  return Math.max(a ?? 0, b ?? 0, c ?? 0, d ?? 0);
}

/// GB/T 39335 表 D.5 矩阵 · 行=影响(1-4) 列=可能性(1-4)
/// 严格按国标表 D.5
const GBT_LABEL_MATRIX: Record<number, Record<number, '严重' | '高' | '中' | '低'>> = {
  4: { 1: '中', 2: '高', 3: '严重', 4: '严重' },
  3: { 1: '中', 2: '中', 3: '高',   4: '严重' },
  2: { 1: '低', 2: '中', 3: '中',   4: '高'   },
  1: { 1: '低', 2: '低', 3: '中',   4: '中'   },
};

/// 综合等级 = 矩阵查表 · 映射到 RiskLevel(严重→HIGH)
export function gbtRiskLevel(
  impactOverall?: number | null,
  likelihoodOverall?: number | null,
): RiskLevel {
  const lab = gbtLevelLabel(impactOverall, likelihoodOverall);
  if (lab === '严重' || lab === '高') return 'HIGH';
  if (lab === '中') return 'MEDIUM';
  if (lab === '低') return 'LOW';
  return 'UNRATED';
}

/// 综合等级 label · 严格按表 D.5 返回 严重/高/中/低/未评
export function gbtLevelLabel(impact?: number | null, likelihood?: number | null): string {
  const i = impact ?? 0;
  const l = likelihood ?? 0;
  if (i <= 0 || l <= 0) return '未评';
  return GBT_LABEL_MATRIX[Math.min(4, i)]?.[Math.min(4, l)] ?? '未评';
}

/// 综合等级配色
export function gbtLevelColor(impact?: number | null, likelihood?: number | null): string {
  const label = gbtLevelLabel(impact, likelihood);
  switch (label) {
    case '严重': return 'bg-red-600 text-white';
    case '高':   return 'bg-orange-400 text-orange-950';
    case '中':   return 'bg-amber-200 text-amber-900';
    case '低':   return 'bg-emerald-200 text-emerald-900';
    default:     return 'bg-slate-200 text-slate-600';
  }
}
