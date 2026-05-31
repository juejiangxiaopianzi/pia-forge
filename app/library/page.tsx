import Link from 'next/link';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const SCOPE_LABEL: Record<string, { label: string; cls: string }> = {
  ORG: { label: '公共', cls: 'bg-blue-50 text-blue-700' },
  TEAM: { label: '团队', cls: 'bg-amber-50 text-amber-700' },
  PRIVATE: { label: '私人', cls: 'bg-violet-50 text-violet-700' },
  PROJECT: { label: '项目', cls: 'bg-slate-100 text-slate-700' },
};

const KB_TYPE_LABEL: Record<string, string> = {
  GITHUB_REPO: 'GitHub',
  FEISHU_SPACE: '飞书',
  FEISHU_WIKI: '飞书 Wiki',
  LOCAL_DIR: '本地目录',
  NOTION: 'Notion',
  OBSIDIAN: 'Obsidian',
  URL_LIST: '公网订阅',
  OTHER: '其他',
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  GITHUB_FILE: 'GitHub',
  FEISHU_DOC: '飞书文档',
  FEISHU_MESSAGE: '飞书消息',
  FEISHU_WIKI: '飞书 Wiki',
  FEISHU_SHEET: '飞书表格',
  FEISHU_BASE: '飞书多维表',
  EMAIL: '邮件',
  FILE: '文件',
  URL: '公网',
  AGENT_MEMORY: 'Agent 记忆',
  EXTERNAL_API: 'API',
  OTHER: '其他',
};

const TABS = [
  { key: 'laws', label: '法规', desc: '公共 · PIPL/国标/出境办法等', scopes: ['ORG'] as const, badgeCls: 'bg-blue-50 text-blue-700' },
  { key: 'team', label: '团队 wiki', desc: '部门内部 · 飞书空间同步', scopes: ['TEAM'] as const, badgeCls: 'bg-amber-50 text-amber-700' },
  { key: 'private', label: '私人解读', desc: '你的 GitHub Private · Agent 写入', scopes: ['PRIVATE'] as const, badgeCls: 'bg-violet-50 text-violet-700' },
  { key: 'all', label: '全部', desc: '所有 scope · 含项目级引用', scopes: ['ORG', 'TEAM', 'PRIVATE', 'PROJECT'] as const, badgeCls: 'bg-slate-100 text-slate-700' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { q?: string; tab?: string };
}) {
  const q = (searchParams.q ?? '').trim();
  const tabKey = (TABS.find((t) => t.key === searchParams.tab)?.key ?? 'laws') as TabKey;
  const activeTab = TABS.find((t) => t.key === tabKey)!;
  const scopes = activeTab.scopes;

  // 各 tab 的总数(显示在 tab 上)
  const tabCounts = await Promise.all(
    TABS.map((t) =>
      db.source.count({ where: { scope: { in: t.scopes as any } } }),
    ),
  );

  // KB 只有 PRIVATE/TEAM/ORG 三个 scope · Source 多一个 PROJECT
  const kbScopes = scopes.filter((s) => s !== 'PROJECT');
  const kbs = await db.knowledgeBase.findMany({
    where: kbScopes.length > 0 ? { isActive: true, scope: { in: kbScopes as any } } : { isActive: true },
    orderBy: [{ scope: 'asc' }, { createdAt: 'asc' }],
  });

  const sourceWhere: any = { scope: { in: scopes as any } };
  if (q) {
    sourceWhere.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { excerpt: { contains: q, mode: 'insensitive' } },
      { body: { contains: q, mode: 'insensitive' } },
      { tags: { has: q } },
    ];
  }

  const sources = await db.source.findMany({
    where: sourceWhere,
    orderBy: [{ scope: 'asc' }, { title: 'asc' }],
    include: { knowledgeBase: { select: { id: true, name: true, type: true, scope: true } } },
  });

  // 也拉一下没有挂 KB 的孤立 Source
  const sourceByKb = new Map<string | null, typeof sources>();
  for (const s of sources) {
    const k = s.knowledgeBaseId;
    if (!sourceByKb.has(k)) sourceByKb.set(k, [] as any);
    sourceByKb.get(k)!.push(s);
  }

  const totalSources = sources.length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">{activeTab.label} · 系统内可预览</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
          {tabKey === 'laws' ? '法规库' : tabKey === 'team' ? '团队知识库' : tabKey === 'private' ? '私人知识库' : '知识库 · 全部'}
        </h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-slate-500">
          {tabKey === 'laws' && '官方法规 / 国家标准 / 监管办法。Agent 在做评估时通过 MCP 检索这里拿条款依据。新增由 Agent 装的 legal-ingest skill 自动爬公网原文入库。'}
          {tabKey === 'team' && '部门内部 wiki(飞书空间)同步过来的内部文档、会议纪要、内部规章。在「设置→知识库连接」录入飞书地址后系统定期同步。'}
          {tabKey === 'private' && '你的私人解读、案例、判定口径。Agent 装 legal-review skill 后做完判断会自动 push 到你 GitHub Private repo(huangyue-compliance-kb),本系统索引并渲染。'}
          {tabKey === 'all' && '所有 scope 的 Source · 含项目级引用。一般不需要直接看这里 · 通过具体 tab 看更清楚。'}
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {TABS.map((t, i) => {
            const active = t.key === tabKey;
            return (
              <Link
                key={t.key}
                href={`/library?tab=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className={`relative -mb-px flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 transition ${
                  active
                    ? 'border-blue-600 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <span>{t.label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${active ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {tabCounts[i]}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 检索 */}
      <form className="card-soft flex flex-wrap items-center gap-3 p-3" method="get">
        <input type="hidden" name="tab" value={tabKey} />
        <input
          name="q"
          defaultValue={q}
          placeholder={`在「${activeTab.label}」里检索 · 标题 / 标签 / 正文...`}
          className="flex-1 min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none"
        />
        <button type="submit" className="btn-primary">检索</button>
        {q && (
          <Link href={`/library?tab=${tabKey}`} className="text-[12px] text-slate-500 hover:text-slate-900">清除</Link>
        )}
        <span className="ml-auto text-[11px] text-slate-400">本 tab 共 {totalSources} 条</span>
      </form>

      {/* 按 KB 分组渲染 */}
      <div className="space-y-6">
        {kbs.map((kb) => {
          const list = sourceByKb.get(kb.id) ?? [];
          if (list.length === 0 && q) return null;
          const scopeMeta = SCOPE_LABEL[kb.scope] ?? SCOPE_LABEL.PROJECT;
          return (
            <section key={kb.id} className="card-soft">
              <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${scopeMeta.cls}`}>{scopeMeta.label}</span>
                <span className="chip text-[10px]">{KB_TYPE_LABEL[kb.type] ?? kb.type}</span>
                <h2 className="text-[15px] font-semibold text-slate-900">{kb.name}</h2>
                <span className="ml-auto font-mono text-[10px] text-slate-400">{kb.uri}</span>
              </header>
              {kb.description && <p className="px-5 pt-3 text-[12px] text-slate-500">{kb.description}</p>}
              <div className="p-3">
                {list.length === 0 ? (
                  <p className="px-2 py-4 text-[12px] text-slate-400">这个知识库还没有同步过任何内容</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {list.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/library/${s.id}`}
                          className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-blue-50/40"
                        >
                          <span className="chip text-[10px]">{SOURCE_TYPE_LABEL[s.type] ?? s.type}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-slate-900">{s.title || s.uri}</p>
                            {s.excerpt && <p className="mt-1 text-[12px] text-slate-500 line-clamp-2">{s.excerpt}</p>}
                            {s.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {s.tags.slice(0, 6).map((t) => (
                                  <span key={t} className="chip text-[10px]">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">预览 →</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })}

        {/* 孤立的 Source(无 KB)*/}
        {(sourceByKb.get(null)?.length ?? 0) > 0 && (
          <section className="card-soft">
            <header className="flex items-center gap-2 border-b border-slate-100 p-5">
              <span className="chip text-[10px]">未分组</span>
              <h2 className="text-[15px] font-semibold text-slate-900">未归属任何知识库的引用</h2>
            </header>
            <ul className="divide-y divide-slate-100 p-3">
              {sourceByKb.get(null)!.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/library/${s.id}`}
                    className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-blue-50/40"
                  >
                    <span className="chip text-[10px]">{SOURCE_TYPE_LABEL[s.type] ?? s.type}</span>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium">{s.title || s.uri}</p>
                      {s.excerpt && <p className="mt-1 text-[12px] text-slate-500 line-clamp-2">{s.excerpt}</p>}
                    </div>
                    <span className="text-[11px] text-slate-400">预览 →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="card-soft border-l-2 border-l-blue-500 bg-blue-50/30 p-5 text-[12px] leading-relaxed text-slate-600">
        <p className="font-semibold text-slate-800">如何录入?</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><span className="font-medium">公共法规</span> · 你的 Agent 装 <code className="rounded bg-white px-1">legal-ingest</code> skill,看到新法规自动爬原文写到这里</li>
          <li><span className="font-medium">飞书部门 wiki</span> · 在 <Link href="/settings/knowledge-bases" className="text-blue-600 hover:underline">知识库连接</Link> 里录入飞书地址,系统定时同步</li>
          <li><span className="font-medium">个人解读</span> · 你的 Agent 装 <code className="rounded bg-white px-1">legal-review</code> skill,做完判断后 push 到你 GitHub Private repo,本系统索引并预览</li>
        </ul>
      </div>
    </div>
  );
}
