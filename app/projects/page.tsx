import Link from 'next/link';
import { db } from '@/lib/db';
import { RISK_LEVEL_LABEL, RISK_LEVEL_COLOR } from '@/lib/risk';

export const dynamic = 'force-dynamic';

export default async function ProjectsListPage() {
  const projects = await db.piaProject.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { dataItems: true, risks: true, mitigations: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">评估项目</h1>
        <Link
          href="/projects/new"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          + 新建评估
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">编号</th>
              <th className="px-4 py-3">标题</th>
              <th className="px-4 py-3">版本</th>
              <th className="px-4 py-3">残余风险</th>
              <th className="px-4 py-3">审批</th>
              <th className="px-4 py-3 text-right">更新时间</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}`} className="font-medium text-violet-700 hover:underline">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.version}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${RISK_LEVEL_COLOR[p.residualLevel]}`}>
                    {RISK_LEVEL_LABEL[p.residualLevel]}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.approvalState}</td>
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
