import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-session';
import { db } from '@/lib/db';
import Breadcrumb from '@/components/Breadcrumb';
import MyTasksClient from './MyTasksClient';

export const dynamic = 'force-dynamic';

export default async function MyTasksPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/my-tasks');

  const assignments = await db.assignment.findMany({
    where: { organizationId: session.organizationId, assigneeUserId: session.userId },
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    include: {
      assigner: { select: { id: true, name: true, email: true } },
      assignerAgent: { select: { id: true, displayName: true } },
    },
  });

  // 为 Risk / DataItem / Mitigation / Scenario / Conclusion 查 projectId 拼跳转
  const targetIds = assignments.map((a) => a.targetId);
  const [risks, dataItems, mitigations, scenarios, conclusions] = await Promise.all([
    db.risk.findMany({ where: { id: { in: targetIds } }, select: { id: true, projectId: true } }),
    db.dataItem.findMany({ where: { id: { in: targetIds } }, select: { id: true, projectId: true } }),
    db.mitigation.findMany({ where: { id: { in: targetIds } }, select: { id: true, projectId: true } }),
    db.scenario.findMany({ where: { id: { in: targetIds } }, select: { id: true, projectId: true } }),
    db.conclusion.findMany({ where: { id: { in: targetIds } }, select: { id: true, projectId: true } }),
  ]);
  const projectIdMap = new Map<string, { type: string; projectId: string }>();
  risks.forEach((r) => projectIdMap.set(r.id, { type: 'Risk', projectId: r.projectId }));
  dataItems.forEach((r) => projectIdMap.set(r.id, { type: 'DataItem', projectId: r.projectId }));
  mitigations.forEach((r) => projectIdMap.set(r.id, { type: 'Mitigation', projectId: r.projectId }));
  scenarios.forEach((r) => projectIdMap.set(r.id, { type: 'Scenario', projectId: r.projectId }));
  conclusions.forEach((r) => projectIdMap.set(r.id, { type: 'Conclusion', projectId: r.projectId }));

  function targetHref(targetType: string, targetId: string): string | null {
    if (targetType === 'PiaProject') return `/projects/${targetId}`;
    const hit = projectIdMap.get(targetId);
    if (!hit) return null;
    switch (targetType) {
      case 'Risk': return `/projects/${hit.projectId}/risks/${targetId}`;
      case 'DataItem': return `/projects/${hit.projectId}/data-items`;
      case 'Mitigation': return `/projects/${hit.projectId}/mitigations`;
      case 'Scenario': return `/projects/${hit.projectId}/scenarios`;
      case 'Conclusion': return `/projects/${hit.projectId}/conclusion`;
      default: return `/projects/${hit.projectId}`;
    }
  }

  // 序列化 Date 给 client
  const items = assignments.map((a) => ({
    ...a,
    dueAt: a.dueAt ? a.dueAt.toISOString() : null,
    completedAt: a.completedAt ? a.completedAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    targetHref: targetHref(a.targetType, a.targetId),
  }));

  return (
    <div className="max-w-5xl space-y-6">
      <Breadcrumb items={[{ label: '我的任务' }]} />
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">My Tasks</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">我的任务</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
          这里汇集了别人(或 Agent)派给你的协作任务 · 包含定性确认 / 证据补充 / 措施推进 / 文档审阅。
        </p>
      </div>

      <MyTasksClient initialItems={items} />
    </div>
  );
}
