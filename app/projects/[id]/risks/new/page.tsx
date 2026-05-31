import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { labelsFor } from '@/lib/module-labels';
import type { RiskCategory, RiskStrategy } from '@prisma/client';

export const dynamic = 'force-dynamic';

const CATEGORIES: { value: RiskCategory; label: string }[] = [
  { value: 'LEGAL_BASIS', label: '合法性基础' },
  { value: 'NECESSITY', label: '必要性 / 最小必要' },
  { value: 'NOTICE', label: '告知充分性' },
  { value: 'CONSENT', label: '同意获取与撤回' },
  { value: 'RECEIVER', label: '接收方资质与控制' },
  { value: 'TECH_SECURITY', label: '技术安全 / 泄漏' },
  { value: 'RIGHTS_HARM', label: '个人权益侵害' },
  { value: 'CROSS_BORDER_JURISDICTION', label: '跨境管辖' },
  { value: 'DATA_QUALITY', label: '数据质量' },
  { value: 'TRACEABILITY', label: '留痕与可审计' },
];

const STRATEGIES: { value: RiskStrategy; label: string }[] = [
  { value: 'MITIGATE', label: '缓解 Mitigate' },
  { value: 'TRANSFER', label: '转移 Transfer' },
  { value: 'ACCEPT', label: '接受 Accept' },
  { value: 'AVOID', label: '规避 Avoid' },
];

export default async function NewRiskPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();
  const L = labelsFor(project.assessmentType);

  async function createRisk(formData: FormData) {
    'use server';
    const projectId = params.id;
    const name = String(formData.get('name') || '').trim();
    const category = String(formData.get('category') || 'LEGAL_BASIS') as RiskCategory;
    const description = String(formData.get('description') || '');
    const likelihood = Number(formData.get('likelihood') || 3);
    const severity = Number(formData.get('severity') || 3);
    const legalClauses = String(formData.get('legalClauses') || '');
    const strategy = String(formData.get('strategy') || 'MITIGATE') as RiskStrategy;

    const count = await db.risk.count({ where: { projectId } });
    await db.risk.create({
      data: {
        projectId,
        code: `R-${String(count + 1).padStart(3, '0')}`,
        name,
        category,
        description,
        likelihood,
        severity,
        legalClauses,
        strategy,
      },
    });
    revalidatePath(`/projects/${projectId}/risks`);
    revalidatePath(`/projects/${projectId}`);
    redirect(`/projects/${projectId}/risks`);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/projects/${project.id}/risks`} className="text-xs text-muted-foreground hover:text-foreground">← 返回 {L.risk.plural}</Link>
        <h1 className="mt-1 text-2xl font-semibold">新增{L.risk.singular}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {project.code} · {project.title}
        </p>
      </div>

      <form action={createRisk} className="card-soft space-y-5 p-6">
        <Field name="name" label={`${L.risk.singular}名称`} required placeholder={`如：3,733 家应签未签外企 · 合同义务缺失`} />

        <label className="block text-sm">
          <span className="block font-medium">类别 <span className="text-red-500">*</span></span>
          <select name="category" required defaultValue="LEGAL_BASIS" className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="block font-medium">描述</span>
          <textarea name="description" rows={4} placeholder="讲清楚为什么是这个等级 · 200-400 字"
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="block font-medium">可能性 (1-5)</span>
            <input type="number" name="likelihood" min={1} max={5} defaultValue={3}
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
          </label>
          <label className="block text-sm">
            <span className="block font-medium">严重程度 (1-5)</span>
            <input type="number" name="severity" min={1} max={5} defaultValue={3}
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
          </label>
        </div>

        <Field name="legalClauses" label="触及法条" placeholder="如：PIPL §28；§39；GB/T 35273 4.5" />

        <label className="block text-sm">
          <span className="block font-medium">处置策略</span>
          <select name="strategy" defaultValue="MITIGATE" className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm">
            {STRATEGIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Link href={`/projects/${project.id}/risks`} className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50">
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
