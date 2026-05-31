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
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">评估项目</p>
          <h1 className="mt-1 text-2xl font-semibold">{filterType ? `${filterType} 模块` : '全部评估'}</h1>
        </div>
        <Link
          href="/projects/new"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 新建评估
        </Link>
      </div>

      <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-white p-1">
        {MODULE_TAB.map((t) => {
          const active = (t.type ?? '') === (filterType ?? '');
          return (
            <Link
              key={t.label}
              href={t.type ? `/projects?module=${t.type}` : '/projects'}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                active ? 'bg-blue-100 text-blue-700' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">编号</th>
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">标题</th>
              <th className="px-4 py-3">版本</th>
              <th className="px-4 py-3">残余风险</th>
              <th className="px-4 py-3">审批</th>
              <th className="px-4 py-3 text-right">更新时间</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                没有项目。<Link href="/projects/new" className="text-blue-700 hover:underline">创建第一个 →</Link>
              </td></tr>
            )}
            {projects.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                    {p.assessmentType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}`} className="font-medium text-blue-700 hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.version}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${RISK_LEVEL_COLOR[p.residualLevel]}`}>
                    {RISK_LEVEL_LABEL[p.residualLevel]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{p.approvalState}</td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">
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
