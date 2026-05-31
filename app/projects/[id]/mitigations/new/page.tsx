import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { labelsFor } from '@/lib/module-labels';
import type { ControlType, AcceptanceLevel } from '@prisma/client';

export const dynamic = 'force-dynamic';

const TYPES: { value: ControlType; label: string }[] = [
  { value: 'TECHNICAL', label: '技术控制' },
  { value: 'PROCESS', label: '管理流程' },
  { value: 'LEGAL', label: '法律合同' },
  { value: 'PRODUCT_UX', label: '产品交互' },
  { value: 'TRAINING', label: '培训意识' },
  { value: 'AUDIT', label: '审计监控' },
];

const ACCEPTANCE: { value: AcceptanceLevel; label: string }[] = [
  { value: 'ACCEPTABLE', label: '可接受' },
  { value: 'CONDITIONAL', label: '有条件可接受' },
  { value: 'UNACCEPTABLE', label: '不可接受 · 需复评' },
  { value: 'NOT_EVALUATED', label: '尚未评估' },
];

export default async function NewMitigationPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();
  const L = labelsFor(project.assessmentType);

  const risks = await db.risk.findMany({
    where: { projectId: project.id },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true },
  });

  async function createMitigation(formData: FormData) {
    'use server';
    const projectId = params.id;
    const riskId = String(formData.get('riskId') || '');
    const name = String(formData.get('name') || '').trim();
    const controlType = String(formData.get('controlType') || 'PROCESS') as ControlType;
    const details = String(formData.get('details') || '');
    const dueAtStr = String(formData.get('dueAt') || '');
    const resL = Number(formData.get('residualLikelihood') || 0);
    const resS = Number(formData.get('residualSeverity') || 0);
    const acceptable = String(formData.get('acceptable') || 'NOT_EVALUATED') as AcceptanceLevel;
    const acceptReason = String(formData.get('acceptReason') || '');

    const count = await db.mitigation.count({ where: { projectId } });
    await db.mitigation.create({
      data: {
        projectId,
        riskId,
        code: `C-${String(count + 1).padStart(3, '0')}`,
        name,
        controlType,
        details,
        dueAt: dueAtStr ? new Date(dueAtStr) : null,
        residualLikelihood: resL > 0 ? resL : null,
        residualSeverity: resS > 0 ? resS : null,
        acceptable,
        acceptReason: acceptReason || null,
      },
    });
    revalidatePath(`/projects/${projectId}/mitigations`);
    revalidatePath(`/projects/${projectId}`);
    redirect(`/projects/${projectId}/mitigations`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/projects/${project.id}/mitigations`} className="text-xs text-muted-foreground hover:text-foreground">← 返回 {L.mitigation.plural}</Link>
        <h1 className="mt-1 text-2xl font-semibold">新增{L.mitigation.singular}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{project.code} · {project.title}</p>
      </div>

      {risks.length === 0 ? (
        <div className="card-soft p-8 text-center text-sm text-muted-foreground">
          请先创建至少一个{L.risk.singular}，才能为其添加{L.mitigation.singular}。
          <div className="mt-3">
            <Link href={`/projects/${project.id}/risks/new`} className="text-blue-700 hover:underline">
              去创建{L.risk.singular} →
            </Link>
          </div>
        </div>
      ) : (
        <form action={createMitigation} className="card-soft space-y-5 p-6">
          <label className="block text-sm">
            <span className="block font-medium">关联{L.risk.singular} <span className="text-red-500">*</span></span>
            <select name="riskId" required className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm">
              {risks.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}
            </select>
          </label>

          <label className="block text-sm">
            <span className="block font-medium">{L.mitigation.singular}名称 <span className="text-red-500">*</span></span>
            <input name="name" required placeholder="如：6/30 前完成 3,733 家补签或断访问"
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
          </label>

          <label className="block text-sm">
            <span className="block font-medium">措施类型</span>
            <select name="controlType" defaultValue="PROCESS" className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>

          <label className="block text-sm">
            <span className="block font-medium">措施详情</span>
            <textarea name="details" rows={4} placeholder="责任部门 + 动作 + 时间节点 + 验收标准"
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
          </label>

          <label className="block text-sm">
            <span className="block font-medium">完成时限</span>
            <input type="date" name="dueAt"
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="block font-medium">措施后可能性 (1-5)</span>
              <input type="number" name="residualLikelihood" min={1} max={5}
                className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="block font-medium">措施后严重程度 (1-5)</span>
              <input type="number" name="residualSeverity" min={1} max={5}
                className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
            </label>
          </div>

          <label className="block text-sm">
            <span className="block font-medium">是否可接受</span>
            <select name="acceptable" defaultValue="NOT_EVALUATED" className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm">
              {ACCEPTANCE.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </label>

          <label className="block text-sm">
            <span className="block font-medium">接受/不接受理由</span>
            <textarea name="acceptReason" rows={2} placeholder="如果是有条件接受，必须写清条件"
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Link href={`/projects/${project.id}/mitigations`} className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50">取消</Link>
            <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
              创建
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
