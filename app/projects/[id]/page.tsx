import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { riskValue, riskLevelOf, RISK_LEVEL_LABEL, RISK_LEVEL_COLOR } from '@/lib/risk';
import { labelsFor } from '@/lib/module-labels';
import Breadcrumb from '@/components/Breadcrumb';
import RiskMatrix from '@/components/RiskMatrix';
import ProjectDashboard from '@/components/ProjectDashboard';

export const dynamic = 'force-dynamic';

export default async function ProjectOverview({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({
    where: { id: params.id },
    include: {
      risks: { select: { id: true, likelihood: true, severity: true, category: true, name: true, code: true } },
      mitigations: { select: { acceptable: true } },
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

  const acceptableCount = project.mitigations.filter((m) => m.acceptable === 'ACCEPTABLE').length;
  const conditionalCount = project.mitigations.filter((m) => m.acceptable === 'CONDITIONAL').length;
  const unacceptableCount = project.mitigations.filter((m) => m.acceptable === 'UNACCEPTABLE').length;

  const topRisks = [...project.risks]
    .map((r) => ({ ...r, value: riskValue(r.likelihood, r.severity) ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: '评估', href: '/projects' },
        { label: `${project.code} · ${project.title}` },
      ]} />

      <div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="chip-blue">{L.module}</span>
          <span className="font-mono text-slate-400">{project.code}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500">{project.version}</span>
        </div>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight leading-tight">{project.title}</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-slate-500">{project.scope}</p>
      </div>

      <nav className="flex gap-0.5 overflow-x-auto border-b border-slate-200/60">
        {TABS.map((t) => (
          <Link
            key={t.slug}
            href={`/projects/${project.id}${t.slug ? '/' + t.slug : ''}`}
            className={`whitespace-nowrap -mb-px border-b-2 px-3.5 py-2.5 text-[13px] transition ${
              !t.slug ? 'border-blue-600 font-medium text-blue-700' : 'border-transparent font-medium text-slate-500 hover:text-slate-900'
            }`}
            title={t.desc}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* Dashboard 总览 */}
      <ProjectDashboard
        stats={{
          totalRisks: project._count.risks,
          highCount: riskByLevel.HIGH,
          mediumCount: riskByLevel.MEDIUM,
          lowCount: riskByLevel.LOW,
          totalMitigations: project._count.mitigations,
          acceptableCount,
          conditionalCount,
          unacceptableCount,
          dataItems: project._count.dataItems,
          scenarios: project._count.scenarios,
          roles: project._count.roles,
          residualLevel: project.residualLevel,
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <RiskMatrix risks={project.risks} projectId={project.id} />

        <div className="card-soft p-5">
          <h3 className="text-[15px] font-semibold">Top 5 高分风险</h3>
          {topRisks.length === 0 ? (
            <p className="mt-3 text-[12px] text-slate-400">还没有风险</p>
          ) : (
            <ol className="mt-3 space-y-2 text-[12px]">
              {topRisks.map((r) => {
                const lv = riskLevelOf(r.value);
                return (
                  <li key={r.code}>
                    <Link href={`/projects/${project.id}/risks/${r.id}`} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-blue-50/40">
                      <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${RISK_LEVEL_COLOR[lv]}`}>{r.value}</span>
                      <div className="flex-1">
                        <p className="font-mono text-[10px] text-slate-500">{r.code} · {r.category}</p>
                        <p className="leading-snug text-slate-900">{r.name}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      <div className="card-soft p-5">
        <h3 className="text-[15px] font-semibold">本评估元信息</h3>
        <dl className="mt-3 space-y-2 text-[13px]">
          <Row label="Module" value={`${L.module} · ${L.modulesDesc}`} />
          <Row label="评估起止" value={`${project.startedAt.toLocaleDateString('zh-CN')} → ${project.targetDoneAt?.toLocaleDateString('zh-CN') ?? '—'}`} />
          <Row label="整体结论" value={<span className="text-slate-700">{project.overallVerdict}</span>} />
          <Row label="残余风险" value={<span className={`rounded-full px-2.5 py-0.5 text-[11px] ${RISK_LEVEL_COLOR[project.residualLevel]}`}>{RISK_LEVEL_LABEL[project.residualLevel]}</span>} />
          <Row label="审批状态" value={project.approvalState} />
          <Row label="评估依据" value={<span className="text-[12px] text-slate-600">{project.legalBases.join(' · ') || '—'}</span>} />
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-[11px] uppercase tracking-wider text-slate-500 whitespace-nowrap">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
