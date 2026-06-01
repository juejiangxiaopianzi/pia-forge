'use client';

import { useEffect, useState, useCallback } from 'react';

type CommentNode = {
  id: string;
  body: string;
  mentions: string[];
  replyToId: string | null;
  createdAt: string;
  authorUserId: string | null;
  authorAgentId: string | null;
  author?: { id: string; name: string | null; email: string } | null;
  authorAgent?: { id: string; displayName: string } | null;
};

function fmtTime(s: string): string {
  try {
    const d = new Date(s);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins} 分钟前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} 小时前`;
    return d.toLocaleString('zh-CN', { hour12: false });
  } catch {
    return s;
  }
}

type Props = {
  targetType: string;
  targetId: string;
};

export default function CommentThread({ targetType, targetId }: Props) {
  const [items, setItems] = useState<CommentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/comments?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`,
        { credentials: 'include' },
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? '加载失败');
      setItems(json.data ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!draft.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/comments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          body: draft.trim(),
          replyToId: replyTo,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? '提交失败');
      setDraft('');
      setReplyTo(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // 构造树
  const byId = new Map(items.map((c) => [c.id, c]));
  const roots = items.filter((c) => !c.replyToId || !byId.has(c.replyToId));
  const childrenOf = (id: string) => items.filter((c) => c.replyToId === id);

  function renderNode(c: CommentNode, depth: number) {
    const isAgent = !!c.authorAgentId;
    const label = isAgent
      ? c.authorAgent?.displayName ?? 'Agent'
      : c.author?.name ?? c.author?.email ?? '未知';
    return (
      <div key={c.id} style={{ marginLeft: depth * 20 }} className="card-soft mt-2 p-3">
        <div className="flex items-center gap-2">
          <span className={isAgent ? 'chip-blue' : 'chip'}>{isAgent ? `Agent · ${label}` : label}</span>
          <span className="text-[11px] text-slate-400">{fmtTime(c.createdAt)}</span>
        </div>
        <div className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">{c.body}</div>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setReplyTo(c.id)}
            className="text-[11px] text-blue-600 hover:underline"
          >
            回复
          </button>
        </div>
        {childrenOf(c.id).map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold text-slate-900">评论与讨论</h3>
        <span className="text-[11px] text-slate-500">{items.length} 条</span>
      </div>

      {loading ? (
        <p className="text-[12px] text-slate-500">加载中…</p>
      ) : items.length === 0 ? (
        <p className="text-[12px] text-slate-500">还没有评论 · 在下面留第一条</p>
      ) : (
        <div>{roots.map((r) => renderNode(r, 0))}</div>
      )}

      <div className="card-soft p-3">
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 text-[11px] text-slate-500">
            <span className="chip-amber">回复模式</span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-[11px] text-slate-500 hover:text-slate-900 hover:underline"
            >
              取消回复 · 改成独立评论
            </button>
          </div>
        )}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="写下你的判断 · 支持 markdown"
          rows={3}
          className="ring-focus w-full rounded-xl border border-slate-200 bg-white p-3 text-[13px] text-slate-900 placeholder:text-slate-400"
        />
        {error && <p className="mt-2 text-[11px] text-rose-600">{error}</p>}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">提交后立即可见</span>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !draft.trim()}
            className="btn-primary text-[12px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '提交中…' : '提交评论'}
          </button>
        </div>
      </div>
    </div>
  );
}
