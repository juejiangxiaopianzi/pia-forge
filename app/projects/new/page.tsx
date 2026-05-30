import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function createProject(formData: FormData) {
  'use server';
  const code = String(formData.get('code') || '').trim() || `PIA-${Date.now().toString(36).toUpperCase().slice(-4)}`;
  const title = String(formData.get('title') || '').trim() || '未命名 PIA 评估';
  const scope = String(formData.get('scope') || '').trim();
  const purpose = String(formData.get('purpose') || '').trim();

  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: '默认组织', slug: 'default', description: '' } });
  }

  const project = await db.piaProject.create({
    data: {
      organizationId: org.id,
      code,
      title,
      scope,
      purpose,
      legalBases: ['PIPL §55-56', 'GB/T 39335-2020 PIA'],
      startedAt: new Date(),
      reviewTriggers: '①出境量级上升 >20% ②新增接收方类型 ③字段重大变更 ④监管法规更新 ⑤数据泄露 ⑥距上次签字满 12 个月',
      version: 'v0.1',
    },
  });
  revalidatePath('/');
  redirect(`/projects/${project.id}`);
}

export default function NewProjectPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">新建评估项目</h1>
        <p className="mt-1 text-sm text-muted-foreground">创建一个新的 PIA 评估。后续可在项目内继续填实信息项、场景、风险、措施、结论。</p>
      </div>

      <form action={createProject} className="space-y-4 rounded-xl border bg-white p-6">
        <Field name="code" label="评估编号" placeholder="PIA-XXX-001（留空自动生成）" />
        <Field name="title" label="评估对象（标题）" required placeholder="如：xxx 业务 xxx 数据出境" />
        <Textarea name="scope" label="评估范围" placeholder="覆盖的业务/数据流/时间窗口/边界" />
        <Textarea name="purpose" label="评估目的" placeholder="为什么做这次 PIA — 监管要求 / 内部审计 / 新功能上线 等" />
        <div className="flex justify-end gap-2 pt-2">
          <button type="submit" className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700">
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
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      />
    </label>
  );
}

function Textarea({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <label className="block text-sm">
      <span className="block font-medium">{label}</span>
      <textarea
        name={name}
        placeholder={placeholder}
        rows={4}
        className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      />
    </label>
  );
}
