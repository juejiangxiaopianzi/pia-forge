import Link from 'next/link';
import { gbtLevelColor, gbtLevelLabel, GBT_SCORE_LABEL } from '@/lib/risk';

type RiskInput = {
  id: string;
  code: string;
  name: string;
  /// 国标新口径
  impactOverall?: number | null;
  likelihoodOverall?: number | null;
  /// 旧口径(fallback)
  likelihood?: number | null;
  severity?: number | null;
};

/// 把旧 1-5 线性映射到 0-4(供历史数据兜底)
function legacyTo04(v?: number | null): number {
  if (v == null) return 0;
  return Math.max(0, Math.min(4, Math.round(((v - 1) * 4) / 4)));
}
function getImpact(r: RiskInput): number {
  if (r.impactOverall != null && r.impactOverall > 0) return r.impactOverall;
  return legacyTo04(r.severity);
}
function getLikelihood(r: RiskInput): number {
  if (r.likelihoodOverall != null && r.likelihoodOverall > 0) return r.likelihoodOverall;
  return legacyTo04(r.likelihood);
}

export default function RiskMatrix({
  risks,
  projectId,
  title = '风险评分矩阵 · GB/T 39335',
}: {
  risks: RiskInput[];
  projectId: string;
  title?: string;
}) {
  // grid[impact][likelihood] = risks[]
  // impact 1-4 倒序(4 在上)
  const grid: RiskInput[][][] = [];
  for (let i = 4; i >= 1; i--) {
    const row: RiskInput[][] = [];
    for (let l = 1; l <= 4; l++) {
      row.push(risks.filter((r) => getImpact(r) === i && getLikelihood(r) === l));
    }
    grid.push(row);
  }

  const counts = {
    严重: risks.filter((r) => gbtLevelLabel(getImpact(r), getLikelihood(r)) === '严重').length,
    高:   risks.filter((r) => gbtLevelLabel(getImpact(r), getLikelihood(r)) === '高').length,
    中:   risks.filter((r) => gbtLevelLabel(getImpact(r), getLikelihood(r)) === '中').length,
    低:   risks.filter((r) => gbtLevelLabel(getImpact(r), getLikelihood(r)) === '低').length,
  };

  return (
    <div className="card-soft p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
        <p className="text-[11px] text-slate-500">权益影响 × 安全事件可能性 · 国标表 D.5</p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-[11px]" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '90px' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '22%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="text-[10px] font-medium text-slate-400">影响 \\ 可能</th>
              {[1, 2, 3, 4].map((l) => (
                <th key={l} className="px-2 py-1 text-center text-[10px] font-medium text-slate-500">
                  {GBT_SCORE_LABEL[l]}({l})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, ri) => {
              const i = 4 - ri;
              return (
                <tr key={i}>
                  <td className="px-2 py-1 text-right text-[11px] font-medium text-slate-500">
                    {GBT_SCORE_LABEL[i]}({i})
                  </td>
                  {row.map((cell, ci) => {
                    const l = ci + 1;
                    const color = gbtLevelColor(i, l);
                    return (
                      <td key={ci} className="p-0 h-24 align-top">
                        <div className={`relative h-24 w-full rounded-lg p-1 ${color} flex flex-col items-stretch justify-start`}>
                          <div className="absolute top-1 right-1.5 text-[10px] font-bold opacity-70 tabular-nums">
                            {gbtLevelLabel(i, l)}
                          </div>
                          <div className="flex flex-1 flex-wrap items-start gap-1 pt-4 overflow-hidden content-start">
                            {cell.map((r) => (
                              <Link
                                key={r.id}
                                href={`/projects/${projectId}/risks/${r.id}`}
                                className="rounded bg-white/60 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-800 hover:bg-white"
                                title={r.name}
                              >
                                {r.code}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-[11px]">
        <Bucket cls="bg-red-600" name="严重" count={counts.严重} />
        <Bucket cls="bg-orange-400" name="高" count={counts.高} />
        <Bucket cls="bg-amber-300" name="中" count={counts.中} />
        <Bucket cls="bg-emerald-300" name="低" count={counts.低} />
      </div>
    </div>
  );
}

function Bucket({ cls, name, count }: { cls: string; name: string; count: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50/60 px-3 py-2">
      <span className={`h-3 w-3 rounded-full ${cls}`} />
      <span className="font-semibold text-slate-900">{name}</span>
      <span className="ml-auto text-[14px] font-bold tabular-nums text-slate-900">{count}</span>
    </div>
  );
}
