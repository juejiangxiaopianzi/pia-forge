import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth-session';
import type { SourceType, SourceScope } from '@prisma/client';

export const dynamic = 'force-dynamic';

// 与 MCP create_source 的 enum 完全对齐
const TYPES: { value: SourceType; label: string }[] = [
  { value: 'URL', label: '公网链接' },
  { value: 'FILE', label: '文件 / PDF' },
  { value: 'EMAIL', label: '邮件' },
  { value: 'GITHUB_FILE', label: 'GitHub 文件' },
  { value: 'FEISHU_DOC', label: '飞书文档' },
  { value: 'FEISHU_MESSAGE', label: '飞书消息' },
  { value: 'FEISHU_WIKI', label: '飞书 Wiki' },
  { value: 'FEISHU_SHEET', label: '飞书表格' },
  { value: 'FEISHU_BASE', label: '飞书多维表' },
  { value: 'AGENT_MEMORY', label: 'Agent 记忆' },
  { value: 'EXTERNAL_API', label: '外部 API' },
  { value: 'OTHER', label: '其他' },
];

const SCOPES: { value: SourceScope; label: string; desc: string }[] = [
  { value: 'ORG', label: '公共法规（ORG）', desc: '官方法规 / 国标 / 监管办法 · 全组织可检索' },
  { value: 'TEAM', label: '团队（TEAM）', desc: '部门内部 wiki / 纪要 / 规章' },
  { value: 'PRIVATE', label: '私人（PRIVATE）', desc: '你的私人解读 / 判定口径' },
  { value: 'PROJECT', label: '项目级（PROJECT）', desc: '某次评估的临时引用' },
];

export default async function NewSourcePage() {
  const session = await requireSession();

  // 当前组织的知识库（可选归属）
  const kbs = await db.knowledgeBase.findMany({
    where: { organizationId: session.organizationId, isActive: true },
    orderBy: [{ scope: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, scope: true },
  });

  async function createSource(formData: FormData) {
    'use server';
    const s = await requireSession();

    const type = String(formData.get('type') || 'URL') as SourceType;
    const uri = String(formData.get('uri') || '').trim();
    const title = String(formData.get('title') || '').trim();
    const excerpt = String(formData.get('excerpt') || '').trim() || null;
    const body = String(formData.get('body') || '').trim() || null;
    const scope = String(formData.get('scope') || 'ORG') as SourceScope;
    const knowledgeBaseId = String(formData.get('knowledgeBaseId') || '').trim() || null;
    const tags = String(formData.get('tags') || '')
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (!uri || !title) {
      // 最低限度校验：uri + title 必填（与 MCP required 一致）
      throw new Error('uri 和 title 必填');
    }

    await db.source.create({
      data: {
        organizationId: s.organizationId,
        knowledgeBaseId,
        type,
        uri,
        title,
        body,
        excerpt,
        tags,
        scope,
        capturedByActorType: 'HUMAN',
        capturedByUserId: s.userId,
      },
    });

    revalidatePath('/library');
    redirect('/library');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/library" className="text-xs text-slate-500 hover:text-slate-900">← 返回知识库</Link>
        <h1 className="mt-1 text-2xl font-semibold">手动录入一条知识</h1>
        <p className="mt-2 text-sm text-slate-500">
          人工录入法规原文 / 内部文件 / 客户给的材料 / Agent 爬不下来的内容。
          录入后等同于 Agent 通过 <code className="rounded bg-slate-100 px-1">legal-ingest</code> 写入的 Source，可被评估引用。
        </p>
      </div>

      <form action={createSource} className="card-soft space-y-5 p-6">
        <label className="block text-sm">
          <span className="block font-medium">标题 <span className="text-red-500">*</span></span>
          <input name="title" required placeholder="如：《个人信息保护法》第二十八条"
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="block font-medium">类型 <span className="text-red-500">*</span></span>
            <select name="type" required defaultValue="URL"
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm">
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>

          <label className="block text-sm">
            <span className="block font-medium">归属（scope）<span className="text-red-500">*</span></span>
            <select name="scope" required defaultValue="ORG"
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm">
              {SCOPES.map((sc) => <option key={sc.value} value={sc.value}>{sc.label}</option>)}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="block font-medium">来源标识 URI <span className="text-red-500">*</span></span>
          <input name="uri" required placeholder="公网链接 · 文件名 · github://owner/repo/path@sha · 飞书文档 token"
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm font-mono" />
          <span className="mt-1 block text-[11px] text-slate-400">稳定标识。没有链接时填一个能定位原件的字符串（如「客户XX邮件_20260604.pdf」）。</span>
        </label>

        <label className="block text-sm">
          <span className="block font-medium">归属知识库</span>
          <select name="knowledgeBaseId" defaultValue=""
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm">
            <option value="">— 不归属（孤立引用）—</option>
            {kbs.map((kb) => <option key={kb.id} value={kb.id}>{kb.name}（{kb.scope}）</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="block font-medium">摘要</span>
          <textarea name="excerpt" rows={2} placeholder="一句话说明这条是什么 · 列表里展示"
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
        </label>

        <label className="block text-sm">
          <span className="block font-medium">正文（markdown）</span>
          <textarea name="body" rows={10} placeholder="粘贴法规原文 / 文件全文 · 用于系统内预览和被评估引用"
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm font-mono" />
        </label>

        <label className="block text-sm">
          <span className="block font-medium">标签</span>
          <input name="tags" placeholder="逗号分隔 · 如：PIPL, 第28条, 敏感个人信息"
            className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/library" className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50">取消</Link>
          <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">录入</button>
        </div>
      </form>
    </div>
  );
}
