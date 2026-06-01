import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import Breadcrumb from '@/components/Breadcrumb';
import { riskValue, riskLevelOf, RISK_LEVEL_LABEL } from '@/lib/risk';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({
    where: { id: params.id },
    include: {
      dataItems: { select: { classification: true } },
      risks: { select: { likelihood: true, severity: true, category: true } },
      mitigations: { select: { status: true, controlType: true, residualLikelihood: true, residualSeverity: true, acceptable: true } },
      roles: { select: { status: true } },
      scenarios: { select: { status: true } },
    },
  });
  if (!project) notFound();

  const classCount = countBy(project.dataItems, 'classification');
  const riskByLevel = { HIGH: 0, MEDIUM: 0, LOW: 0, UNRATED: 0 };
  project.risks.forEach((r) => (riskByLevel[riskLevelOf(riskValue(r.likelihood, r.severity))] += 1));
  const riskByCategory = countBy(project.risks, 'category');
  const mitiByStatus = countBy(project.mitigations, 'status');
  const mitiByType = countBy(project.mitigations, 'controlType');
  const residualByLevel = { HIGH: 0, MEDIUM: 0, LOW: 0, UNRATED: 0 };
  project.mitigations.forEach((m) => (residualByLevel[riskLevelOf(riskValue(m.residualLikelihood, m.residualSeverity))] += 1));
  const roleStatus = countBy(project.roles, 'status');

  return (
    <div className="space-y-8">
      <Breadcrumb items={[
        { label: '评估', href: '/projects' },
        { label: project.code, href: `/projects/${project.id}` },
        { label: '仪表盘' },
      ]} />

      <div>
        <p className="text-xs text-muted-foreground">{project.code} · 可视化仪表盘</p>
        <h1 className="mt-1 text-2xl font-semibold">PIA 仪表盘</h1>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="信息项总数" value={project.dataItems.length} />
        <Stat label="敏感 PI 项数" value={classCount.SENSITIVE ?? 0} accent="red" />
        <Stat label="争议待裁定" value={classCount.DISPUTED ?? 0} accent="orange" />
        <Stat label="高风险数量" value={riskByLevel.HIGH} accent="red" />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <BarBlock title="风险等级分布（初始）" data={Object.entries(riskByLevel).map(([k, v]) => ({ label: RISK_LEVEL_LABEL[k as keyof typeof RISK_LEVEL_LABEL], value: v }))} />
        <BarBlock title="残余风险等级分布" data={Object.entries(residualByLevel).map(([k, v]) => ({ label: RISK_LEVEL_LABEL[k as keyof typeof RISK_LEVEL_LABEL], value: v }))} />
        <BarBlock title="风险类别分布" data={Object.entries(riskByCategory).map(([k, v]) => ({ label: k, value: v as number }))} />
        <BarBlock title="控制措施状态" data={Object.entries(mitiByStatus).map(([k, v]) => ({ label: k, value: v as number }))} />
        <BarBlock title="措施类型" data={Object.entries(mitiByType).map(([k, v]) => ({ label: k, value: v as number }))} />
        <BarBlock title="RACI 角色交付状态" data={Object.entries(roleStatus).map(([k, v]) => ({ label: k, value: v as number }))} />
      </section>
    </div>
  );
}

function countBy<T extends Record<string, any>>(arr: T[], key: keyof T) {
  return arr.reduce<Record<string, number>>((acc, item) => {
    const k = String(item[key]);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: 'red' | 'orange' }) {
  const cls = accent === 'red' ? 'text-red-600' : accent === 'orange' ? 'text-orange-600' : 'text-foreground';
  return (
    <div className="rounded-xl border bg-white p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}

function BarBlock({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="rounded-xl border bg-white p-5">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-4 space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-3 text-xs">
            <span className="w-32 truncate text-muted-foreground">{d.label}</span>
            <div className="relative h-3 flex-1 rounded bg-gray-100">
              <div
                className="h-3 rounded bg-blue-500"
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </div>
            <span className="w-8 tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
