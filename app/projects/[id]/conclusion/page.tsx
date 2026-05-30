import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { RISK_LEVEL_LABEL, RISK_LEVEL_COLOR } from '@/lib/risk';
import { labelsFor } from '@/lib/module-labels';

export const dynamic = 'force-dynamic';

export default async function ConclusionPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();
  const L = labelsFor(project.assessmentType);

  const conclusions = await db.conclusion.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' },
    include: { signer: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">{project.code} · 07 {L.conclusion.plural}</p>
        <h1 className="mt-1 text-2xl font-semibold">{L.conclusion.plural}</h1>
      </div>

      {conclusions.map((c) => (
        <article key={c.id} className="rounded-xl border bg-white p-6">
          <header className="flex items-start justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-semibold">{c.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{c.evaluationTarget}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs ${RISK_LEVEL_COLOR[c.residualLevel]}`}>
              残余 · {RISK_LEVEL_LABEL[c.residualLevel]}
            </span>
          </header>

          <Section title="整体评估结论" content={c.overallVerdict} />
          <Section title="关键高风险事项摘要" content={c.highRiskSummary} />
          <Section title="给业务方的建议" content={c.businessAdvice} />
          <Section title="给监管的对外口径" content={c.regulatorTone} />

          <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-xs">
            <div>
              <p className="text-muted-foreground">签字人</p>
              <p className="mt-0.5 font-medium">{c.signer?.name ?? '—'}</p>
              <p className="text-muted-foreground">{c.signerRoleLabel}</p>
            </div>
            <div>
              <p className="text-muted-foreground">签字日期 / 复评</p>
              <p className="mt-0.5 font-medium">
                {c.signedAt?.toLocaleDateString('zh-CN') ?? '待签'} → {c.nextReviewAt?.toLocaleDateString('zh-CN') ?? '—'}
              </p>
              <p className="text-muted-foreground">{c.state}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <section className="mt-5">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{content}</p>
    </section>
  );
}
