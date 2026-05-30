import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { riskValue, riskLevelOf, RISK_LEVEL_LABEL, RISK_LEVEL_COLOR } from '@/lib/risk';

export const dynamic = 'force-dynamic';

export default async function RisksPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();

  const risks = await db.risk.findMany({
    where: { projectId: project.id },
    orderBy: [{ likelihood: 'desc' }, { severity: 'desc' }],
    include: {
      dataItems: { select: { code: true, name: true } },
      scenarios: { select: { code: true, name: true } },
      mitigations: { select: { id: true, code: true, name: true, status: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{project.code} · 05 风险登记册</p>
          <h1 className="mt-1 text-2xl font-semibold">风险登记册</h1>
        </div>
        <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
          + 新增风险
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-3">编号</th>
              <th className="px-3 py-3">风险</th>
              <th className="px-3 py-3">类别</th>
              <th className="px-3 py-3 text-center">可能</th>
              <th className="px-3 py-3 text-center">严重</th>
              <th className="px-3 py-3 text-center">风险值</th>
              <th className="px-3 py-3">等级</th>
              <th className="px-3 py-3">处置</th>
              <th className="px-3 py-3">措施</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r) => {
              const v = riskValue(r.likelihood, r.severity);
              const lv = riskLevelOf(v);
              return (
                <tr key={r.id} className="border-t align-top hover:bg-gray-50">
                  <td className="px-3 py-3 font-mono text-xs">{r.code}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{r.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                    {(r.dataItems.length > 0 || r.scenarios.length > 0) && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        关联：{[...r.dataItems.map((d) => d.code), ...r.scenarios.map((s) => s.code)].join(' · ')}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">{r.category}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{r.likelihood}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{r.severity}</td>
                  <td className="px-3 py-3 text-center font-semibold tabular-nums">{v ?? '—'}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${RISK_LEVEL_COLOR[lv]}`}>{RISK_LEVEL_LABEL[lv]}</span>
                  </td>
                  <td className="px-3 py-3 text-xs">{r.strategy}</td>
                  <td className="px-3 py-3 text-xs">
                    {r.mitigations.length === 0 ? (
                      <span className="text-red-500">无</span>
                    ) : (
                      r.mitigations.map((m) => (
                        <div key={m.id} className="text-muted-foreground">{m.code}</div>
                      ))
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
