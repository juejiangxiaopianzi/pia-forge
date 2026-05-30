import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{project.code} · 报告导出</p>
          <h1 className="mt-1 text-2xl font-semibold">PIA 报告预览</h1>
          <p className="mt-1 text-sm text-muted-foreground">下载 docx · 下载 PDF · 同步飞书云文档 — 即将上线</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50" disabled>
            ⬇ docx
          </button>
          <button className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50" disabled>
            ⬇ PDF
          </button>
          <a
            href={`/api/projects/${project.id}/report.md`}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            ⬇ Markdown
          </a>
        </div>
      </div>

      <article className="prose prose-sm max-w-none rounded-xl border bg-white p-8">
        <header className="border-b pb-4">
          <p className="text-xs">{project.code} · {project.version}</p>
          <h1 className="!mt-2 !text-2xl">{project.title}</h1>
          <p className="text-sm text-muted-foreground">
            评估期间：{project.startedAt.toLocaleDateString('zh-CN')} → {project.targetDoneAt?.toLocaleDateString('zh-CN') ?? '—'}
          </p>
        </header>

        <h2>一、评估摘要</h2>
        <p>{concl?.overallVerdict ?? '尚未生成结论。'}</p>

        <h2>二、评估对象与范围</h2>
        <p>{project.scope}</p>

        <h2>三、评估目的</h2>
        <p>{project.purpose}</p>

        <h2>四、评估依据</h2>
        <ul>
          {project.legalBases.map((l) => <li key={l}>{l}</li>)}
        </ul>

        <h2>五、信息项分类（{project.dataItems.length} 项）</h2>
        <table className="text-xs">
          <thead><tr><th>编号</th><th>字段</th><th>分类</th><th>出境</th><th>现状</th></tr></thead>
          <tbody>
            {project.dataItems.map((d) => (
              <tr key={d.id}>
                <td>{d.code}</td><td>{d.name}</td><td>{d.classification}</td><td>{d.isOutbound ? '✓' : ''}</td><td>{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>六、出境场景（{project.scenarios.length}）</h2>
        {project.scenarios.map((s) => (
          <div key={s.id}>
            <h3>{s.code} · {s.name}</h3>
            <p>{s.description}</p>
            <p className="text-xs text-muted-foreground">现状：{s.status} · 接收方：{s.receiverType}</p>
          </div>
        ))}

        <h2>七、高风险摘要（{highRisks.length} 项）</h2>
        <ul>
          {highRisks.map((r) => (
            <li key={r.id}>
              <strong>{r.code}</strong>（{r.value} · {RISK_LEVEL_LABEL[riskLevelOf(r.value)]}）— {r.name}
              <ul>
                {r.mitigations.map((m) => <li key={m.id} className="text-xs">↳ {m.code} {m.name}</li>)}
              </ul>
            </li>
          ))}
        </ul>

        <h2>八、评估结论</h2>
        <p>{concl?.overallVerdict ?? '—'}</p>
        <p><strong>给业务方：</strong>{concl?.businessAdvice}</p>
        <p><strong>给监管的口径：</strong>{concl?.regulatorTone}</p>

        <h2>九、复评机制</h2>
        <p>下次复评日期：{concl?.nextReviewAt?.toLocaleDateString('zh-CN') ?? '—'}</p>
        <p>{project.reviewTriggers}</p>
      </article>
    </div>
  );
}
