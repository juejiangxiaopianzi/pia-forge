'use client';

import { useState } from 'react';

type Item = {
  id: string;
  targetType: string;
  targetId: string;
  fieldName: string | null;
  currentValue: string | null;
  proposedValue: string | null;
  rationale: string | null;
  createdAt: string;
  requester: { id: string; name: string | null; email: string } | null;
};

type Decision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

function fmtDate(s: string) {
  try { return new Date(s).toLocaleString('zh-CN', { hour12: false }); } catch { return s; }
}

export default function MyReviewsClient({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, status: Decision) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/reviews/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, decisionNote: notes[id] ?? null }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? '提交失败');
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="card-soft p-8 text-center">
        <p className="text-[13px] text-slate-500">现在没有待你审阅的请求</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <div className="card-soft p-3 text-[12px] text-rose-700">{error}</div>}
      <ul className="space-y-4">
        {items.map((r) => (
          <li key={r.id} className="card-soft p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">{r.targetType}</span>
              {r.fieldName && <span className="chip-blue">字段 · {r.fieldName}</span>}
              {r.requester && (
                <span className="chip">由 {r.requester.name ?? r.requester.email} 发起</span>
              )}
              <span className="ml-auto text-[11px] text-slate-400">{fmtDate(r.createdAt)}</span>
            </div>

            {r.rationale && (
              <div className="mt-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">理由</p>
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">{r.rationale}</p>
              </div>
            )}

            {(r.currentValue || r.proposedValue) && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">当前值</p>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-slate-700">{r.currentValue ?? '(空)'}</pre>
                </div>
                <div className="rounded-xl bg-blue-50/60 p-3 ring-1 ring-blue-100">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-blue-700">建议值</p>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-slate-800">{r.proposedValue ?? '(空)'}</pre>
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="text-[11px] font-medium text-slate-600">决策备注 · 可选</label>
              <textarea
                rows={2}
                value={notes[r.id] ?? ''}
                onChange={(e) => setNotes((m) => ({ ...m, [r.id]: e.target.value }))}
                placeholder="为什么这样判 · 给 Agent / 同事一个明确反馈"
                className="ring-focus mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-[12px] text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => decide(r.id, 'REJECTED')}
                className="rounded-xl bg-white px-4 py-2 text-[12px] font-medium text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50"
              >
                驳回
              </button>
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => decide(r.id, 'CHANGES_REQUESTED')}
                className="rounded-xl bg-white px-4 py-2 text-[12px] font-medium text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50 disabled:opacity-50"
              >
                请修改
              </button>
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => decide(r.id, 'APPROVED')}
                className="btn-primary text-[12px] disabled:opacity-50"
              >
                {busy === r.id ? '提交中…' : '批准'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
