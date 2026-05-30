import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import type { AssessmentType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const MODULES: { type: AssessmentType; label: string; desc: string; codePrefix: string }[] = [
  { type: 'PIA', label: 'PIA · 个人信息保护影响评估', desc: 'PIPL §55-56 / 数据出境 / 敏感 PI 处理', codePrefix: 'PIA' },
  { type: 'AUDIT', label: 'Audit · 合规审计', desc: '内审 / 子公司审计 / 监管审计', codePrefix: 'AUDIT' },
  { type: 'FILING', label: 'Filing · 申报与备案', desc: '数据出境申报 / 承诺函台账', codePrefix: 'FILING' },
  { type: 'NOTICE', label: 'Notice · 告知与同意', desc: '隐私政策 / 弹窗版本管理', codePrefix: 'NOTICE' },
  { type: 'INCIDENT', label: 'Incident · 事件响应', desc: '数据事件 / 客诉 / 反诈线索', codePrefix: 'INCIDENT' },
];

async function createProject(formData: FormData) {
  'use server';
  const assessmentType = (String(formData.get('assessmentType') || 'PIA')) as AssessmentType;
  const code = String(formData.get('code') || '').trim() || `${assessmentType}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
  const title = String(formData.get('title') || '').trim() || '未命名评估';
  const scope = String(formData.get('scope') || '').trim();
  const purpose = String(formData.get('purpose') || '').trim();

  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: '默认组织', slug: 'default', description: '' } });
  }

  const project = await db.piaProject.create({
    data: {
      organizationId: org.id,
      assessmentType,
      code,
      title,
      scope,
      purpose,
      legalBases: assessmentType === 'PIA' ? ['PIPL §55-56', 'GB/T 39335-2020 PIA'] : [],
      startedAt: new Date(),
      reviewTriggers: '①规模上升 >20% ②新增接收方/范围 ③重大变更 ④监管法规更新 ⑤事件发生 ⑥距上次签字满 12 个月',
      version: 'v0.1',
    },
  });
  revalidatePath('/');
  revalidatePath('/projects');
  redirect(`/projects/${project.id}`);
}

export default function NewProjectPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">新建评估</p>
        <h1 className="mt-1 text-2xl font-semibold">创建评估项目</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          选一个 module · 填基本信息 · 后续在项目内继续填角色、信息项、场景、风险、措施、结论。
          也可以让你的 Agent 通过 MCP / REST API 帮你填。
        </p>
      </div>

      <form action={createProject} className="space-y-6 rounded-2xl border bg-white p-6">
        <div>
          <p className="block text-sm font-medium">选择 Module</p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {MODULES.map((m, idx) => (
              <label
                key={m.type}
                className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50"
              >
                <input
                  type="radio"
                  name="assessmentType"
                  value={m.type}
                  defaultChecked={idx === 0}
                  className="mt-0.5 accent-violet-600"
                />
                <div>
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <Field name="code" label="评估编号" placeholder="如 PIA-LP-001（留空自动生成）" />
        <Field name="title" label="评估对象（标题）" required placeholder="如：xxx 业务 xxx 数据出境" />
        <Textarea name="scope" label="评估范围" placeholder="覆盖的业务/数据流/时间窗口/边界" />
        <Textarea name="purpose" label="评估目的" placeholder="为什么做这次评估 — 监管要求 / 内部审计 / 新功能上线 等" />

        <div className="flex justify-end gap-2 pt-2">
          <button type="submit" className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700">
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
        className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
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
        className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      />
    </label>
  );
}
