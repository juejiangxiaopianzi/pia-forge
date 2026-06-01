'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type Status = 'TODO' | 'IN_PROGRESS' | 'AWAITING_REVIEW' | 'DONE' | 'CANCELLED';

type Item = {
  id: string;
  targetType: string;
  targetId: string;
  note: string | null;
  dueAt: string | null;
  status: Status;
  completionNote: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  targetHref: string | null;
  assigner?: { id: string; name: string | null; email: string } | null;
  assignerAgent?: { id: string; displayName: string } | null;
};

const TABS: { key: Status; label: string }[] = [
  { key: 'TODO', label: '待办' },
  { key: 'IN_PROGRESS', label: '进行中' },
  { key: 'AWAITING_REVIEW', label: '待审' },
  { key: 'DONE', label: '已完成' },
];

function statusChip(s: Status) {
  switch (s) {
    case 'TODO': return <span className="chip-amber">待办</span>;
    case 'IN_PROGRESS': return <span className="chip-blue">进行中</span>;
    case 'AWAITING_REVIEW': return <span className="chip-blue">待审</span>;
    case 'DONE': return <span className="chip-green">已完成</span>;
    case 'CANCELLED': return <span className="chip">已取消</span>;
  }
}

function fmtDate(s: string | null) {
  if (!s) return null;
  try { return new Date(s).toLocaleDateString('zh-CN'); } catch { return s; }
}

export default function MyTasksClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [tab, setTab] = useState<Status>('TODO');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, AWAITING_REVIEW: 0, DONE: 0, CANCELLED: 0 };
    items.forEach((i) => { m[i.status] = (m[i.status] ?? 0) + 1; });
    return m;
  }, [items]);

  const list = items.filter((i) => i.status === tab);

  async function updateStatus(id: string, status: Status) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/assignments/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? '更新失败');
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              'relative px-4 py-2 text-[13px] font-medium transition ' +
              (tab === t.key
                ? 'text-blue-700 after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-blue-600'
                : 'text-slate-500 hover:text-slate-900')
            }
          >
            {t.label}
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-medium text-slate-600">
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="card-soft p-3 text-[12px] text-rose-700 ring-rose-200">{error}</div>
      )}

      {list.length === 0 ? (
        <div className="card-soft p-8 text-center">
          <p className="text-[13px] text-slate-500">这个分类下没有任务</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((a) => {
            const assignerLabel = a.assignerAgent
              ? `Agent · ${a.assignerAgent.displayName}`
              : a.assigner?.name ?? a.assigner?.email ?? '系统';
            return (
              <li key={a.id} className="card-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip">{a.targetType}</span>
                      {statusChip(a.status)}
                      <span className="chip-blue">来自 {assignerLabel}</span>
                      {a.dueAt && <span className="chip-amber">截止 {fmtDate(a.dueAt)}</span>}
                    </div>
                    {a.note && (
                      <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">{a.note}</p>
                    )}
                    <p className="mt-2 text-[11px] text-slate-400">派单时间 {fmtDate(a.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {a.targetHref && (
                      <Link
                        href={a.targetHref}
                        className="btn-ghost text-[12px]"
                      >
                        打开记录
                      </Link>
                    )}
                    {a.status !== 'DONE' && a.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        disabled={busy === a.id}
                        onClick={() => updateStatus(a.id, 'DONE')}
                        className="btn-primary text-[12px] disabled:opacity-50"
                      >
                        {busy === a.id ? '提交中…' : '标记完成'}
                      </button>
                    )}
                    {a.status === 'TODO' && (
                      <button
                        type="button"
                        disabled={busy === a.id}
                        onClick={() => updateStatus(a.id, 'IN_PROGRESS')}
                        className="rounded-xl bg-blue-50 px-3 py-1.5 text-[12px] font-medium text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100"
                      >
                        开始处理
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
