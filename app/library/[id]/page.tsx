import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { MarkdownView } from '@/lib/markdown';
import { sourceUriToHref } from '@/lib/citations';

export const dynamic = 'force-dynamic';

const SCOPE_LABEL: Record<string, { label: string; cls: string }> = {
  ORG: { label: '公共 · 全员可引用', cls: 'bg-blue-50 text-blue-700' },
  TEAM: { label: '团队 · 内部可见', cls: 'bg-amber-50 text-amber-700' },
  PRIVATE: { label: '私人 · 仅 owner', cls: 'bg-violet-50 text-violet-700' },
  PROJECT: { label: '项目 · 评估内', cls: 'bg-slate-100 text-slate-700' },
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  GITHUB_FILE: 'GitHub 文件',
  FEISHU_DOC: '飞书文档',
  FEISHU_MESSAGE: '飞书消息',
  FEISHU_WIKI: '飞书 Wiki',
  FEISHU_SHEET: '飞书表格',
  FEISHU_BASE: '飞书多维表',
  EMAIL: '邮件',
  FILE: '文件',
  URL: '公网 URL',
  AGENT_MEMORY: 'Agent 记忆',
  EXTERNAL_API: '外部 API',
  OTHER: '其他',
};

export default async function SourcePreviewPage({ params }: { params: { id: string } }) {
  const source = await db.source.findUnique({
    where: { id: params.id },
    include: {
      knowledgeBase: { select: { id: true, name: true, type: true, scope: true, uri: true } },
    },
  });
  if (!source) notFound();

  // 被引用情况
  const citations = await db.citationLink.findMany({
    where: { toSourceId: source.id },
    orderBy: { citedAt: 'desc' },
  });

  // 拉一下被引用的对象基本信息(Risk / DataItem / Conclusion)
  const riskIds = citations.filter((c) => c.fromType === 'Risk').map((c) => c.fromId);
  const risks = riskIds.length
    ? await db.risk.findMany({
        where: { id: { in: riskIds } },
        select: { id: true, code: true, name: true, projectId: true, project: { select: { id: true, code: true, assessmentType: true } } },
      })
    : [];
  const riskMap = new Map(risks.map((r) => [r.id, r]));

  const { href, label } = sourceUriToHref(source.type, source.uri);
  const scopeMeta = SCOPE_LABEL[source.scope] ?? SCOPE_LABEL.PROJECT;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/library" className="text-[11px] text-slate-500 hover:text-slate-900">
          ← 返回知识库
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${scopeMeta.cls}`}>{scopeMeta.label}</span>
          <span className="chip text-[10px]">{SOURCE_TYPE_LABEL[source.type] ?? source.type}</span>
          {source.knowledgeBase && (
            <span className="text-[11px] text-slate-500">来自:</span>
          )}
          {source.knowledgeBase && (
            <span className="chip-blue text-[10px]">{source.knowledgeBase.name}</span>
          )}
        </div>
        <h1 className="mt-3 text-[26px] font-semibold tracking-tight">{source.title || source.uri}</h1>
        {source.excerpt && <p className="mt-2 text-[13px] text-slate-500">{source.excerpt}</p>}
      </div>

      {/* 元信息条 */}
      <div className="card-soft p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
        <Cell label="稳定标识 (uri)" value={source.uri} mono />
        <Cell label="抓取时间" value={source.capturedAt.toLocaleString('zh-CN')} />
        {source.tags.length > 0 && (
          <Cell label="标签" customValue={
            <div className="flex flex-wrap gap-1">
              {source.tags.map((t) => (
                <span key={t} className="chip text-[10px]">{t}</span>
              ))}
            </div>
          } full />
        )}
        {href && href !== '#' && (
          <Cell label="原文(外部)" customValue={
            <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
              打开 {label} ↗
            </a>
          } full />
        )}
      </div>

      {/* 正文渲染 */}
      <div className="card-soft p-6">
        {source.body ? (
          <MarkdownView source={source.body} />
        ) : (
          <div className="text-[12px] text-slate-400">
            这条 Source 还没有缓存全文(`body` 为空)。
            {href && href !== '#' && (
              <span> · 可以 <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">点这里到原文</a>。</span>
            )}
          </div>
        )}
      </div>

      {/* 被引用情况 */}
      <div className="card-soft p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold">被引用于</h2>
          <span className="chip">{citations.length}</span>
        </div>
        {citations.length === 0 ? (
          <p className="mt-3 text-[12px] text-slate-400">还没有评估对象引用本条。</p>
        ) : (
          <ul className="mt-3 space-y-2 text-[12px]">
            {citations.map((c) => {
              if (c.fromType === 'Risk') {
                const r = riskMap.get(c.fromId);
                if (!r) return null;
                return (
                  <li key={c.id} className="flex items-start gap-2 rounded-lg bg-slate-50/60 p-3">
                    <span className="chip-blue text-[10px]">{c.citationType}</span>
                    <div className="flex-1">
                      <Link
                        href={`/projects/${r.project.id}/risks/${r.id}`}
                        className="font-medium text-slate-900 hover:text-blue-600"
                      >
                        [{r.project.code}] {r.code} · {r.name}
                      </Link>
                      {c.excerpt && <p className="mt-1 text-[11px] text-slate-600">「{c.excerpt}」</p>}
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {c.citedAt.toLocaleDateString('zh-CN')}
                    </span>
                  </li>
                );
              }
              return (
                <li key={c.id} className="text-slate-500">
                  · {c.fromType} {c.fromId} ({c.citationType})
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value, customValue, mono, full }: { label: string; value?: string; customValue?: React.ReactNode; mono?: boolean; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <div className={`mt-1 ${mono ? 'font-mono break-all text-[11px] text-slate-600' : 'text-slate-700'}`}>
        {customValue ?? value ?? '—'}
      </div>
    </div>
  );
}
