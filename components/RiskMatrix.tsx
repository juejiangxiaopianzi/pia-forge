import Link from 'next/link';

type RiskInput = {
  id: string;
  code: string;
  name: string;
  likelihood: number;
  severity: number;
};

const CELL_COLOR = (l: number, s: number) => {
  const v = l * s;
  if (v >= 15) return 'bg-red-500 text-white';
  if (v >= 8) return 'bg-amber-300 text-amber-900';
  if (v >= 4) return 'bg-emerald-200 text-emerald-900';
  return 'bg-emerald-50 text-emerald-700';
};

export default function RiskMatrix({
  risks,
  projectId,
  title = '风险评分矩阵',
}: {
  risks: RiskInput[];
  projectId: string;
  title?: string;
}) {
  // grid[severity][likelihood] = risks[]
  const grid: RiskInput[][][] = [];
  for (let s = 5; s >= 1; s--) {
    const row: RiskInput[][] = [];
    for (let l = 1; l <= 5; l++) {
      row.push(risks.filter((r) => r.likelihood === l && r.severity === s));
    }
    grid.push(row);
  }

  return (
    <div className="card-soft p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
        <p className="text-[11px] text-slate-500">可能性 × 严重程度 · 单元格点开看该格内风险</p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-[11px]">
          <thead>
            <tr>
              <th className="w-20"></th>
              {[1, 2, 3, 4, 5].map((l) => (
                <th key={l} className="px-2 py-1 text-center font-medium text-slate-500">
                  L={l}
                </th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {grid.map((row, ri) => {
              const s = 5 - ri;
              return (
                <tr key={s}>
                  <td className="px-2 py-1 text-right text-[11px] font-medium text-slate-500">
                    S={s}
                  </td>
                  {row.map((cell, ci) => {
                    const l = ci + 1;
                    return (
                      <td key={ci} className="p-0">
                        <div className={`relative aspect-square w-full min-w-[64px] rounded-lg p-1 ${CELL_COLOR(l, s)} flex flex-col items-stretch justify-start`}>
                          <div className="absolute top-1 right-1.5 text-[10px] font-bold opacity-60">{l * s}</div>
                          <div className="flex flex-1 flex-wrap items-start gap-1 pt-3 overflow-hidden">
                            {cell.map((r) => (
                              <Link
                                key={r.id}
                                href={`/projects/${projectId}/risks/${r.id}`}
                                className="rounded bg-white/40 px-1.5 py-0.5 text-[10px] font-mono font-semibold hover:bg-white/80"
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
                  {ri === 2 && (
                    <td rowSpan={5} className="pl-2 text-[10px] text-slate-500 align-bottom">
                      <div className="flex h-full flex-col-reverse items-center gap-1">
                        <span>低</span>
                        <div className="h-12 w-1 bg-gradient-to-t from-emerald-300 to-red-500 rounded-full" />
                        <span>高</span>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            <tr>
              <td></td>
              <td colSpan={5} className="pt-2 text-center text-[11px] text-slate-500">
                ──── 可能性(L)──→
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
        <Bucket cls="bg-red-500" name="HIGH" count={risks.filter((r) => r.likelihood * r.severity >= 15).length} desc="≥15" />
        <Bucket cls="bg-amber-400" name="MEDIUM" count={risks.filter((r) => { const v = r.likelihood * r.severity; return v >= 8 && v < 15; }).length} desc="8-14" />
        <Bucket cls="bg-emerald-400" name="LOW" count={risks.filter((r) => r.likelihood * r.severity < 8).length} desc="< 8" />
      </div>
    </div>
  );
}

function Bucket({ cls, name, count, desc }: { cls: string; name: string; count: number; desc: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50/60 px-3 py-2">
      <span className={`h-3 w-3 rounded-full ${cls}`} />
      <span className="font-semibold text-slate-900">{name}</span>
      <span className="text-slate-400">{desc}</span>
      <span className="ml-auto text-[14px] font-bold tabular-nums text-slate-900">{count}</span>
    </div>
  );
}
