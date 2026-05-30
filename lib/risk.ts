/**
 * 风险评级 · 共享计算工具
 * 与多维表格里的公式一致：value = likelihood × severity；≥15=高，8-14=中，1-7=低
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
