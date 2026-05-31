import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  GITHUB_REPO: 'GitHub 私有库',
  FEISHU_SPACE: '飞书知识空间',
  FEISHU_WIKI: '飞书 Wiki',
  LOCAL_DIR: '本地目录',
  NOTION: 'Notion',
  OBSIDIAN: 'Obsidian',
  URL_LIST: 'URL 集合',
  OTHER: '其他',
};

async function createKnowledgeBase(formData: FormData) {
  'use server';
  const org = await db.organization.findFirst();
  if (!org) return;
  const owner = await db.user.findFirst();
  const name = String(formData.get('name') ?? '').trim();
  const type = String(formData.get('type') ?? 'OTHER').trim();
  const uri = String(formData.get('uri') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const scope = String(formData.get('scope') ?? 'PRIVATE').trim();
  if (!name || !uri) return;
  await db.knowledgeBase.create({
    data: {
      organizationId: org.id,
      name,
      description: description || null,
      type: type as any,
      uri,
      scope: scope as any,
      ownerUserId: owner?.id ?? null,
      syncStrategy: 'manual',
    },
  });
  revalidatePath('/settings/knowledge-bases');
}

async function toggleKnowledgeBase(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  const kb = await db.knowledgeBase.findUnique({ where: { id } });
  if (!kb) return;
  await db.knowledgeBase.update({ where: { id }, data: { isActive: !kb.isActive } });
  revalidatePath('/settings/knowledge-bases');
}

export default async function KnowledgeBasesPage() {
  const kbs = await db.knowledgeBase.findMany({
    orderBy: [{ createdAt: 'asc' }],
    include: { indexes: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">设置 · 知识库连接</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">知识库连接</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-slate-500">
          PIA Forge 不存放原始知识内容，只保存「在哪能找到」+「引用片段 + commit SHA」。在这里配置你的公共/个人/团队知识库的「物理位置」。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {kbs.length === 0 && (
          <div className="card-soft p-10 text-center text-[13px] text-slate-400">还没有连接</div>
        )}
        {kbs.map((kb) => (
          <article key={kb.id} className={`card-soft p-6 ${!kb.isActive && 'opacity-50'}`}>
            <header className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="chip-blue">{TYPE_LABEL[kb.type] ?? kb.type}</span>
                  <span className="chip">{kb.scope}</span>
                  {!kb.isActive && <span className="chip-amber">已停用</span>}
                  <h3 className="text-[15px] font-semibold text-slate-900">{kb.name}</h3>
                </div>
                {kb.description && (
                  <p className="mt-2 text-[12px] leading-relaxed text-slate-600">{kb.description}</p>
                )}
                <p className="mt-2 font-mono text-[11px] text-slate-500">{kb.uri}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {kb.indexes.length} 条索引 · {kb.syncStrategy} · {kb.lastSyncedAt ? `最近同步 ${kb.lastSyncedAt.toLocaleString('zh-CN')}` : '从未同步'}
                </p>
              </div>
              <form action={toggleKnowledgeBase}>
                <input type="hidden" name="id" value={kb.id} />
                <button type="submit" className="text-[11px] text-slate-500 hover:text-slate-900">
                  {kb.isActive ? '停用' : '启用'}
                </button>
              </form>
            </header>
          </article>
        ))}
      </div>

      <form action={createKnowledgeBase} className="card-soft space-y-4 p-6">
        <h2 className="text-[15px] font-semibold">+ 添加连接</h2>
        <div className="grid grid-cols-2 gap-4">
          <Row label="名称 *">
            <input name="name" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none" />
          </Row>
          <Row label="类型 *">
            <select name="type" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none" defaultValue="GITHUB_REPO">
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Row>
        </div>
        <Row label="物理位置 *">
          <input
            name="uri"
            required
            placeholder="GitHub: owner/repo · 飞书: space_id · 本地: /Users/xx/kb"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none"
          />
        </Row>
        <Row label="说明">
          <textarea
            name="description"
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none"
          />
        </Row>
        <Row label="可见范围">
          <select name="scope" defaultValue="PRIVATE" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none">
            <option value="PRIVATE">PRIVATE · 仅个人</option>
            <option value="TEAM">TEAM · 团队</option>
            <option value="ORG">ORG · 全组织</option>
          </select>
        </Row>
        <button type="submit" className="btn-primary">添加</button>
      </form>

      <div className="card-soft border-l-2 border-l-blue-500 bg-blue-50/30 p-5 text-[12px] leading-relaxed text-slate-600">
        <p className="font-semibold text-slate-800">为什么不直接把知识同步进 PIA Forge?</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>原始知识(法规论证、判例、内审记录)是高价值私有资产 · 不应混入应用数据库</li>
          <li>PIA Forge 评估时只保存「指针 + 摘录 + commit SHA」，原文留在 GitHub/飞书</li>
          <li>这样的好处:同一份知识可被多套合规系统(PIA / AUDIT / 反诈)共享引用，且更新自然</li>
        </ul>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-slate-500">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
