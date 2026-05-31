import Link from 'next/link';
import { db } from '@/lib/db';
import { RISK_LEVEL_LABEL, RISK_LEVEL_COLOR } from '@/lib/risk';

export const dynamic = 'force-dynamic';

const MODULE_TAB: { type: any; label: string }[] = [
  { type: undefined, label: '全部' },
  { type: 'PIA', label: 'PIA' },
  { type: 'AUDIT', label: 'Audit' },
  { type: 'FILING', label: 'Filing' },
  { type: 'NOTICE', label: 'Notice' },
  { type: 'INCIDENT', label: 'Incident' },
];

export default async function ProjectsListPage({ searchParams }: { searchParams: { module?: string } }) {
  const filterType = searchParams.module as any;
  const projects = await db.piaProject.findMany({
    where: filterType ? { assessmentType: filterType } : undefined,
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { dataItems: true, risks: true, mitigations: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">评估项目</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
            {filterType ? `${filterType} 模块` : '全部评估'}
          </h1>
        </div>
        <Link href="/projects/new" className="btn-primary">+ 新建评估</Link>
      </div>

      <nav className="inline-flex gap-0.5 rounded-xl bg-slate-100/80 p-1">
        {MODULE_TAB.map((t) => {
          const active = (t.type ?? '') === (filterType ?? '');
          return (
            <Link
              key={t.label}
              href={t.type ? `/projects?module=${t.type}` : '/projects'}
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="card-soft overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50/50 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">编号</th>
              <th className="px-4 py-3 font-medium">Module</th>
              <th className="px-4 py-3 font-medium">标题</th>
              <th className="px-4 py-3 font-medium">版本</th>
              <th className="px-4 py-3 font-medium">残余风险</th>
              <th className="px-4 py-3 font-medium">审批</th>
              <th className="px-4 py-3 text-right font-medium">更新</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-14 text-center text-sm text-slate-500">
                没有项目。<Link href="/projects/new" className="text-blue-600 hover:underline">创建第一个 →</Link>
              </td></tr>
            )}
            {projects.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 transition hover:bg-blue-50/30">
                <td className="px-4 py-3.5 font-mono text-[12px] text-slate-500">{p.code}</td>
                <td className="px-4 py-3.5">
                  <span className="chip-blue text-[10px]">{p.assessmentType}</span>
                </td>
                <td className="px-4 py-3.5">
                  <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-slate-500">{p.version}</td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${RISK_LEVEL_COLOR[p.residualLevel]}`}>
                    {RISK_LEVEL_LABEL[p.residualLevel]}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-[11px] text-slate-500">{p.approvalState}</td>
                <td className="px-4 py-3.5 text-right text-[11px] text-slate-400">
                  {p.updatedAt.toLocaleDateString('zh-CN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
