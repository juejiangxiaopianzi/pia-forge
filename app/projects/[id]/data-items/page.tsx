import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { labelsFor } from '@/lib/module-labels';

export const dynamic = 'force-dynamic';

const CLASS_LABEL: Record<string, { label: string; cls: string }> = {
  SENSITIVE: { label: '敏感个人信息', cls: 'bg-red-100 text-red-700' },
  GENERAL: { label: '一般个人信息', cls: 'bg-blue-100 text-blue-700' },
  NON_PI: { label: '非个人信息', cls: 'bg-gray-100 text-gray-700' },
  DISPUTED: { label: '存争议待裁定', cls: 'bg-orange-100 text-orange-700' },
};

export default async function DataItemsPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();
  const L = labelsFor(project.assessmentType);

  const items = await db.dataItem.findMany({
    where: { projectId: project.id },
    orderBy: { code: 'asc' },
    include: { scenarios: { select: { code: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{project.code} · 03 {L.dataItem.plural}</p>
          <h1 className="mt-1 text-2xl font-semibold">{L.dataItem.plural}</h1>
        </div>
        <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
          + 新增{L.dataItem.singular}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-3">编号</th>
              <th className="px-3 py-3">字段</th>
              <th className="px-3 py-3">分类</th>
              <th className="px-3 py-3">敏感子类</th>
              <th className="px-3 py-3">合法性基础</th>
              <th className="px-3 py-3 text-center">出境</th>
              <th className="px-3 py-3">现状</th>
              <th className="px-3 py-3">关联场景</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => {
              const c = CLASS_LABEL[d.classification];
              return (
                <tr key={d.id} className="border-t align-top hover:bg-gray-50">
                  <td className="px-3 py-3 font-mono text-xs">{d.code}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{d.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{d.techName}</p>
                    {d.legalReasoning && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.legalReasoning}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${c?.cls ?? ''}`}>{c?.label ?? d.classification}</span>
                  </td>
                  <td className="px-3 py-3 text-xs">{d.sensitiveSub.join(' · ') || '—'}</td>
                  <td className="px-3 py-3 text-xs">{d.legalBasis ?? '—'}</td>
                  <td className="px-3 py-3 text-center">{d.isOutbound ? '✓' : '—'}</td>
                  <td className="px-3 py-3 text-xs">{d.status}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {d.scenarios.map((s) => s.code).join(' · ') || '—'}
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
