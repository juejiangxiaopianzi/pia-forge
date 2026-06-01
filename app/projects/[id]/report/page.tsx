import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import Breadcrumb from '@/components/Breadcrumb';
import { riskValue, riskLevelOf, RISK_LEVEL_LABEL } from '@/lib/risk';

export const dynamic = 'force-dynamic';

export default async function ReportPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({
    where: { id: params.id },
    include: {
      dataItems: true,
      scenarios: true,
      risks: { include: { mitigations: true } },
      conclusions: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!project) notFound();

  const concl = project.conclusions[0];
  const highRisks = project.risks
    .map((r) => ({ ...r, value: riskValue(r.likelihood, r.severity) ?? 0 }))
    .filter((r) => riskLevelOf(r.value) === 'HIGH')
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: '评估', href: '/projects' },
        { label: project.code, href: `/projects/${project.id}` },
        { label: '报告' },
      ]} />

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">{project.code} · 报告导出</p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight">报告预览</h1>
          <p className="mt-1 text-[12px] text-slate-500">docx · PDF · 飞书云文档同步 即将上线</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-xl bg-white px-4 py-2 text-[12px] font-medium text-slate-400 ring-1 ring-slate-200 cursor-not-allowed" disabled>
            ⬇ docx
          </button>
          <button className="rounded-xl bg-white px-4 py-2 text-[12px] font-medium text-slate-400 ring-1 ring-slate-200 cursor-not-allowed" disabled>
            ⬇ PDF
          </button>
          <a
            href={`/api/projects/${project.id}/report.md`}
            className="btn-primary"
          >
            ⬇ Markdown
          </a>
        </div>
      </div>

      <article className="card-soft px-10 py-12">
        <header className="border-b border-slate-100 pb-6">
          <p className="font-mono text-[11px] text-slate-400">{project.code} · {project.version}</p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-slate-900">{project.title}</h1>
          <p className="mt-2 text-[12px] text-slate-500">
            评估期间:{project.startedAt.toLocaleDateString('zh-CN')} → {project.targetDoneAt?.toLocaleDateString('zh-CN') ?? '—'}
          </p>
        </header>

        <ReportSection title="一、评估摘要">
          <p>{concl?.overallVerdict ?? '尚未生成结论。'}</p>
        </ReportSection>

        <ReportSection title="二、评估对象与范围">
          <p className="whitespace-pre-wrap">{project.scope}</p>
        </ReportSection>

        <ReportSection title="三、评估目的">
          <p className="whitespace-pre-wrap">{project.purpose}</p>
        </ReportSection>

        <ReportSection title="四、评估依据">
          <ul className="space-y-1">
            {project.legalBases.map((l) => (
              <li key={l} className="flex items-start gap-2">
                <span className="mt-2 inline-block h-1 w-1 rounded-full bg-slate-400" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </ReportSection>

        <ReportSection title={`五、信息项分类(${project.dataItems.length} 项)`}>
          <div className="overflow-hidden rounded-xl ring-1 ring-slate-200/60">
            <table className="w-full text-[12px]">
              <thead className="bg-slate-50/50 text-left text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">编号</th>
                  <th className="px-3 py-2 font-medium">字段</th>
                  <th className="px-3 py-2 font-medium">分类</th>
                  <th className="px-3 py-2 font-medium">出境</th>
                  <th className="px-3 py-2 font-medium">现状</th>
                </tr>
              </thead>
              <tbody>
                {project.dataItems.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{d.code}</td>
                    <td className="px-3 py-2 text-slate-900">{d.name}</td>
                    <td className="px-3 py-2 text-slate-500">{d.classification}</td>
                    <td className="px-3 py-2">{d.isOutbound ? '✓' : ''}</td>
                    <td className="px-3 py-2 text-slate-500">{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>

        <ReportSection title={`六、出境场景(${project.scenarios.length})`}>
          <div className="space-y-4">
            {project.scenarios.map((s) => (
              <div key={s.id} className="rounded-xl bg-slate-50/60 p-4">
                <h3 className="text-[13px] font-semibold text-slate-900">{s.code} · {s.name}</h3>
                <p className="mt-1 text-[13px] text-slate-600">{s.description}</p>
                <p className="mt-2 text-[11px] text-slate-500">现状:{s.status} · 接收方:{s.receiverType}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection title={`七、高风险摘要(${highRisks.length} 项)`}>
          <ul className="space-y-3">
            {highRisks.map((r) => (
              <li key={r.id}>
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-5 min-w-[2rem] items-center justify-center rounded-full bg-rose-50 px-1.5 text-[11px] font-semibold text-rose-700">{r.value}</span>
                  <div className="flex-1">
                    <p className="text-[13px] text-slate-900">
                      <span className="font-mono text-[11px] text-slate-500">{r.code}</span> · {r.name}
                    </p>
                    {r.mitigations.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {r.mitigations.map((m) => (
                          <li key={m.id} className="text-[11px] text-slate-500">↳ {m.code} {m.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ReportSection>

        <ReportSection title="八、评估结论">
          <p>{concl?.overallVerdict ?? '—'}</p>
          <div className="mt-4 rounded-xl bg-blue-50/40 p-4 ring-1 ring-blue-100/60">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">给业务方</p>
            <p className="mt-1.5">{concl?.businessAdvice ?? '—'}</p>
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">给监管的口径</p>
            <p className="mt-1.5">{concl?.regulatorTone ?? '—'}</p>
          </div>
        </ReportSection>

        <ReportSection title="九、复评机制">
          <p>下次复评日期:<strong className="text-slate-900">{concl?.nextReviewAt?.toLocaleDateString('zh-CN') ?? '—'}</strong></p>
          <p className="mt-2 whitespace-pre-wrap">{project.reviewTriggers}</p>
        </ReportSection>
      </article>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[16px] font-semibold tracking-tight text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-[13.5px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
