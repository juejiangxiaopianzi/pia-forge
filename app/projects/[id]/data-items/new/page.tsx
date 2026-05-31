import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { labelsFor } from '@/lib/module-labels';
import type { PiClass, LegalBasis } from '@prisma/client';

export const dynamic = 'force-dynamic';

const CLASSES: { value: PiClass; label: string }[] = [
  { value: 'SENSITIVE', label: '敏感个人信息' },
  { value: 'GENERAL', label: '一般个人信息' },
  { value: 'NON_PI', label: '非个人信息' },
  { value: 'DISPUTED', label: '存争议待裁定' },
];

const BASES: { value: LegalBasis; label: string }[] = [
  { value: 'SEPARATE_CONSENT', label: '单独同意（敏感PI）' },
  { value: 'GENERAL_CONSENT', label: '概括同意' },
  { value: 'CONTRACT_NECESSITY', label: '履行合同必需' },
  { value: 'LEGAL_OBLIGATION', label: '法定义务' },
  { value: 'PUBLIC_INFO', label: '已公开信息合理处理' },
  { value: 'EMERGENCY', label: '紧急情况' },
  { value: 'OTHER', label: '其他' },
];

export default async function NewDataItemPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();
  const L = labelsFor(project.assessmentType);

  async function createDataItem(formData: FormData) {
    'use server';
    const projectId = params.id;
    const name = String(formData.get('name') || '').trim();
    const techName = String(formData.get('techName') || '').trim() || null;
    const classification = String(formData.get('classification') || 'GENERAL') as PiClass;
    const legalReasoning = String(formData.get('legalReasoning') || '');
    const isOutbound = formData.get('isOutbound') === 'on';
    const legalBasis = String(formData.get('legalBasis') || '') as LegalBasis | '';
    const necessity = String(formData.get('necessity') || '');

    const count = await db.dataItem.count({ where: { projectId } });
    await db.dataItem.create({
      data: {
        projectId,
        code: `DI-${String(count + 1).padStart(3, '0')}`,
        name,
        techName,
        classification,
        legalReasoning,
        isOutbound,
        legalBasis: legalBasis || undefined,
        necessity,
      },
    });
    revalidatePath(`/projects/${projectId}/data-items`);
    revalidatePath(`/projects/${projectId}`);
    redirect(`/projects/${projectId}/data-items`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/projects/${project.id}/data-items`} className="text-xs text-muted-foreground hover:text-foreground">← 返回 {L.dataItem.plural}</Link>
        <h1 className="mt-1 text-2xl font-semibold">新增{L.dataItem.singular}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{project.code} · {project.title}</p>
      </div>

      <form action={createDataItem} className="card-soft space-y-5 p-6">
        <Field name="name" label={`${L.dataItem.singular}名称`} required placeholder="如：简历照片（证件照/头像）" />
        <Field name="techName" label="字段技术名" placeholder="如：resume.photo" />

        <label className="block text-sm">
          <span className="block font-medium">分类 <span className="text-red-500">*</span></span>
          <select name="classification" required defaultValue="GENERAL" className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm">
            {CLASSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="block font-medium">定性依据</span>
          <textarea name="legalReasoning" rows={3} placeholder="引用条款 + 业务场景论证"
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isOutbound" className="accent-blue-600" />
          <span>本字段会出境</span>
        </label>

        <label className="block text-sm">
          <span className="block font-medium">合法性基础</span>
          <select name="legalBasis" defaultValue="" className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm">
            <option value="">— 选择 —</option>
            {BASES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="block font-medium">必要性说明</span>
          <textarea name="necessity" rows={2} placeholder="为什么必须收集这个字段"
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Link href={`/projects/${project.id}/data-items`} className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50">
            取消
          </Link>
          <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
            创建
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ name, label, placeholder, required }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="block font-medium">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>
      <input name={name} required={required} placeholder={placeholder}
        className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
    </label>
  );
}
