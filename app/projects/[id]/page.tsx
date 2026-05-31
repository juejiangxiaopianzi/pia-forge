import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { riskValue, riskLevelOf, RISK_LEVEL_LABEL, RISK_LEVEL_COLOR } from '@/lib/risk';
import { labelsFor } from '@/lib/module-labels';

export const dynamic = 'force-dynamic';

export default async function ProjectOverview({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({
    where: { id: params.id },
    include: {
      risks: { select: { likelihood: true, severity: true, category: true, name: true, code: true } },
      _count: { select: { dataItems: true, scenarios: true, risks: true, mitigations: true, roles: true } },
    },
  });
  if (!project) notFound();

  const L = labelsFor(project.assessmentType);

  const TABS = [
    { slug: '', label: '总览', desc: '01 评估总览' },
    { slug: 'roles', label: '角色', desc: '02 RACI 矩阵' },
    { slug: 'data-items', label: L.dataItem.plural, desc: `03 ${L.dataItem.plural}` },
    { slug: 'scenarios', label: L.scenario.singular, desc: `04 ${L.scenario.plural}` },
    { slug: 'risks', label: L.risk.singular, desc: `05 ${L.risk.plural}` },
    { slug: 'mitigations', label: L.mitigation.singular, desc: `06 ${L.mitigation.plural}` },
    { slug: 'conclusion', label: '结论签字', desc: `07 ${L.conclusion.plural}` },
    { slug: 'dashboard', label: '仪表盘', desc: '可视化' },
    { slug: 'report', label: '报告', desc: L.reportTitle },
  ];

  const riskByLevel = { HIGH: 0, MEDIUM: 0, LOW: 0, UNRATED: 0 };
  project.risks.forEach((r) => {
    const lv = riskLevelOf(riskValue(r.likelihood, r.severity));
    riskByLevel[lv] += 1;
  });

  const topRisks = [...project.risks]
    .map((r) => ({ ...r, value: riskValue(r.likelihood, r.severity) ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">{L.module}</span>
          <span className="font-mono text-muted-foreground">{project.code} · {project.version}</span>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{project.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{project.scope}</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <Link
            key={t.slug}
            href={`/projects/${project.id}${t.slug ? '/' + t.slug : ''}`}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm ${
              !t.slug ? 'border-blue-600 text-blue-700 font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            title={t.desc}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <section className="grid gap-4 md:grid-cols-4">
        <Tile title={L.dataItem.singular} value={project._count.dataItems} />
        <Tile title={L.scenario.singular} value={project._count.scenarios} />
        <Tile title={L.risk.singular} value={project._count.risks} sub={riskByLevel.HIGH > 0 ? `高 ${riskByLevel.HIGH}` : undefined} />
        <Tile title={L.mitigation.singular} value={project._count.mitigations} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card-soft p-5">
          <h3 className="text-sm font-medium">本评估摘要</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Module" value={`${L.module} · ${L.modulesDesc}`} />
            <Row label="评估起止" value={`${project.startedAt.toLocaleDateString('zh-CN')} → ${project.targetDoneAt?.toLocaleDateString('zh-CN') ?? '—'}`} />
            <Row label="整体结论" value={project.overallVerdict} />
            <Row label="残余风险" value={<span className={`rounded-full px-2.5 py-0.5 text-xs ${RISK_LEVEL_COLOR[project.residualLevel]}`}>{RISK_LEVEL_LABEL[project.residualLevel]}</span>} />
            <Row label="审批状态" value={project.approvalState} />
            <Row label="评估依据" value={project.legalBases.join(' · ') || '—'} />
          </dl>
        </div>

        <div className="card-soft p-5">
          <h3 className="text-sm font-medium">Top 3 {L.risk.singular}</h3>
          {topRisks.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">还没有 {L.risk.singular}。让你的 Agent 通过 MCP / API 写一些进来，或者在网页直接添加。</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {topRisks.map((r) => {
                const lv = riskLevelOf(r.value);
                return (
                  <li key={r.code} className="flex items-start gap-3">
                    <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] ${RISK_LEVEL_COLOR[lv]}`}>{r.value}</span>
                    <div className="flex-1">
                      <p className="font-mono text-xs text-muted-foreground">{r.code} · {r.category}</p>
                      <p className="leading-snug">{r.name}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Tile({ title, value, sub }: { title: string; value: number; sub?: string }) {
  return (
    <div className="card-soft p-5">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-red-500">{sub}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-1.5 last:border-0">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
