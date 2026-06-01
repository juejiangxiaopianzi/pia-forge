import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import Breadcrumb from '@/components/Breadcrumb';
import { riskValue, riskLevelOf, RISK_LEVEL_LABEL, RISK_LEVEL_COLOR } from '@/lib/risk';
import { labelsFor } from '@/lib/module-labels';

export const dynamic = 'force-dynamic';

export default async function MitigationsPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();
  const L = labelsFor(project.assessmentType);

  const mitigations = await db.mitigation.findMany({
    where: { projectId: project.id },
    orderBy: { dueAt: 'asc' },
    include: { risk: { select: { code: true, name: true } } },
  });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: '评估', href: '/projects' },
        { label: project.code, href: `/projects/${project.id}` },
        { label: '措施' },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{project.code} · 06 {L.mitigation.plural}</p>
          <h1 className="mt-1 text-2xl font-semibold">{L.mitigation.plural}</h1>
        </div>
        <Link href={`/projects/${project.id}/mitigations/new`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + 新增{L.mitigation.singular}
        </Link>
      </div>

      <div className="space-y-3">
        {mitigations.map((m) => {
          const v = riskValue(m.residualLikelihood, m.residualSeverity);
          const lv = riskLevelOf(v);
          return (
            <div key={m.id} className="rounded-xl border bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-mono text-xs text-muted-foreground">
                    {m.code} · 关联 {m.risk.code}
                  </p>
                  <h3 className="mt-1 text-base font-medium">{m.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{m.details}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${RISK_LEVEL_COLOR[lv]}`}>
                    残余 · {RISK_LEVEL_LABEL[lv]} {v ? `(${v})` : ''}
                  </span>
                  <p className="mt-2 text-xs text-muted-foreground">{m.status}</p>
                  {m.dueAt && (
                    <p className="text-xs text-muted-foreground">截止 {m.dueAt.toLocaleDateString('zh-CN')}</p>
                  )}
                </div>
              </div>
              {m.acceptReason && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  接受理由：{m.acceptReason}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
