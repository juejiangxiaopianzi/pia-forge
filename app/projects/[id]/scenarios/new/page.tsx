import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { labelsFor } from '@/lib/module-labels';
import type { ReceiverType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const TYPES: { value: ReceiverType; label: string }[] = [
  { value: 'TRUE_OVERSEAS', label: '真实境外企业' },
  { value: 'FOREIGN_CORP_DOMESTIC', label: '外资在华企业' },
  { value: 'DOMESTIC_OVERSEAS_IP', label: '境内主体海外 IP 漂移' },
  { value: 'PLATFORM_RECOMMENDER', label: '平台搜索/推荐通道' },
  { value: 'USER_DRIVEN_OVERSEAS', label: '求职者主动境外应聘' },
  { value: 'OTHER', label: '其他' },
];

export default async function NewScenarioPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();
  const L = labelsFor(project.assessmentType);

  async function createScenario(formData: FormData) {
    'use server';
    const projectId = params.id;
    const name = String(formData.get('name') || '').trim();
    const description = String(formData.get('description') || '');
    const receiverType = String(formData.get('receiverType') || 'OTHER') as ReceiverType;
    const receiverRegions = String(formData.get('receiverRegions') || '');
    const triggerRules = String(formData.get('triggerRules') || '');
    const safeguards = String(formData.get('safeguards') || '');

    const count = await db.scenario.count({ where: { projectId } });
    await db.scenario.create({
      data: {
        projectId,
        code: `SC-${String(count + 1).padStart(3, '0')}`,
        name,
        description,
        receiverType,
        receiverRegions,
        techPath: '',
        encryption: '',
        triggerRules,
        safeguards,
        scenarioRisk: '',
        legalBases: [],
      },
    });
    revalidatePath(`/projects/${projectId}/scenarios`);
    revalidatePath(`/projects/${projectId}`);
    redirect(`/projects/${projectId}/scenarios`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/projects/${project.id}/scenarios`} className="text-xs text-muted-foreground hover:text-foreground">← 返回 {L.scenario.plural}</Link>
        <h1 className="mt-1 text-2xl font-semibold">新增{L.scenario.singular}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{project.code} · {project.title}</p>
      </div>

      <form action={createScenario} className="card-soft space-y-5 p-6">
        <label className="block text-sm">
          <span className="block font-medium">{L.scenario.singular}名称 <span className="text-red-500">*</span></span>
          <input name="name" required placeholder="如：真实境外企业招聘 · 出境核心场景"
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
        </label>

        <label className="block text-sm">
          <span className="block font-medium">场景描述</span>
          <textarea name="description" rows={4} placeholder="200-400 字 · 讲清楚是谁、做什么、流向何处"
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
        </label>

        <label className="block text-sm">
          <span className="block font-medium">接收方类型 <span className="text-red-500">*</span></span>
          <select name="receiverType" required defaultValue="TRUE_OVERSEAS" className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="block font-medium">接收方所在地</span>
          <input name="receiverRegions" placeholder="如：美、日、新、港、英、德"
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
        </label>

        <label className="block text-sm">
          <span className="block font-medium">触发与拦截规则</span>
          <textarea name="triggerRules" rows={2} placeholder="什么条件下触发、平台如何拦截"
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
        </label>

        <label className="block text-sm">
          <span className="block font-medium">已落地的保护措施</span>
          <textarea name="safeguards" rows={2} placeholder="加密 / 拦截 / 承诺函 / 单独同意 等"
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Link href={`/projects/${project.id}/scenarios`} className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50">取消</Link>
          <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
            创建
          </button>
        </div>
      </form>
    </div>
  );
}
