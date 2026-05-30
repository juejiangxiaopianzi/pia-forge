import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  COMPLIANT: { label: '合规', cls: 'bg-green-100 text-green-700' },
  PARTIAL: { label: '部分合规需整改', cls: 'bg-yellow-100 text-yellow-800' },
  NON_COMPLIANT: { label: '不合规', cls: 'bg-red-100 text-red-700' },
  PENDING: { label: '待评估', cls: 'bg-gray-100 text-gray-700' },
};

export default async function ScenariosPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();

  const scenarios = await db.scenario.findMany({
    where: { projectId: project.id },
    orderBy: { code: 'asc' },
    include: { _count: { select: { dataItems: true, risks: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">{project.code} · 04 出境场景清单</p>
        <h1 className="mt-1 text-2xl font-semibold">出境场景</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {scenarios.map((s) => {
          const st = STATUS_LABEL[s.status];
          return (
            <div key={s.id} className="rounded-xl border bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{s.code}</p>
                  <h3 className="mt-1 text-base font-medium">{s.name}</h3>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${st?.cls ?? ''}`}>{st?.label ?? s.status}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Cell label="接收方" value={s.receiverType} />
                <Cell label="年量级" value={s.annualVolume ? Number(s.annualVolume).toLocaleString('zh-CN') : '—'} />
                <Cell label="占比" value={s.shareRatio ?? '—'} />
                <Cell label="信息项 / 风险" value={`${s._count.dataItems} / ${s._count.risks}`} />
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-gray-50 px-2.5 py-1.5">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate">{value}</dd>
    </div>
  );
}
