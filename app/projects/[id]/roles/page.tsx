import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  PIA_LEAD: 'PIA 主理人',
  LEGAL_LEAD: '法务负责人',
  C_END_PRODUCT: 'C 端产品',
  B_END_PRODUCT: 'B 端产品',
  DATA_TEAM: '数据团队',
  ENGINEERING: '研发负责人',
  SECURITY_AUDIT: '安全审核中心',
  COMPLIANCE_OFFICER: '合规专员',
  EXEC_APPROVER: 'CTO / 高管',
  EXTERNAL_COUNSEL: '外部法律顾问',
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  NOT_STARTED: { label: '未开始', cls: 'bg-gray-100 text-gray-700' },
  IN_PROGRESS: { label: '进行中', cls: 'bg-blue-100 text-blue-700' },
  DONE: { label: '已完成', cls: 'bg-green-100 text-green-700' },
  OVERDUE: { label: '逾期', cls: 'bg-red-100 text-red-700' },
  BLOCKED: { label: 'Blocked', cls: 'bg-amber-100 text-amber-800' },
};

export default async function RolesPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();

  const roles = await db.piaRole.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'asc' },
    include: { user: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">{project.code} · 02 角色与职责（RACI）</p>
        <h1 className="mt-1 text-2xl font-semibold">RACI 矩阵</h1>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-3">角色</th>
              <th className="px-3 py-3">姓名</th>
              <th className="px-3 py-3">RACI</th>
              <th className="px-3 py-3">阶段</th>
              <th className="px-3 py-3">应交付物</th>
              <th className="px-3 py-3">截止</th>
              <th className="px-3 py-3">状态</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => {
              const st = STATUS_LABEL[r.status];
              return (
                <tr key={r.id} className="border-t align-top hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <p className="font-medium">{ROLE_LABEL[r.roleType] ?? r.roleType}</p>
                    <p className="text-xs text-muted-foreground">{r.shortLabel}</p>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {r.user?.name ?? <span className="text-red-500">待补</span>}
                    {r.organization && <div className="text-muted-foreground">{r.organization}</div>}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {r.raciFlags.map((f) => (
                      <span key={f} className="mr-1 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">{f}</span>
                    ))}
                  </td>
                  <td className="px-3 py-3 text-[10px] text-muted-foreground">
                    {r.stages.map((s) => s.replace(/^S\d_/, '')).join(' · ')}
                  </td>
                  <td className="px-3 py-3 text-xs">{r.deliverable}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {r.dueAt?.toLocaleDateString('zh-CN') ?? '—'}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${st?.cls ?? ''}`}>{st?.label ?? r.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
