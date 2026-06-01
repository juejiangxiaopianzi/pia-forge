'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [code, setCode] = useState(sp.get('code') ?? '');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) {
      setErr('两次密码不一致');
      return;
    }
    setPending(true);
    const r = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.toUpperCase(), email, name, password }),
    });
    setPending(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setErr(d.error ?? '注册失败');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="inline-block h-10 w-10 rounded-[12px] bg-[linear-gradient(135deg,_#5B8DEF_0%,_#3D7BFF_55%,_#2563EB_100%)] shadow-md shadow-blue-200/50" />
          <h1 className="mt-3 text-[22px] font-semibold tracking-tight">用邀请码注册</h1>
          <p className="mt-1 text-[12px] text-slate-500">仅限被邀请的合规人 · 一码一人</p>
        </div>

        <form onSubmit={submit} className="card-soft space-y-4 p-6">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500">邀请码</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              autoFocus={!sp.get('code')}
              placeholder="ABC-7K9"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[13px] focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-slate-400">从邀请你的合规人那里拿到 · 形如 ABC-7K9</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500">姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="cherry"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="cherry@..."
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-slate-400">至少 8 位</p>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500">确认密码</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none"
            />
          </div>

          {err && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{err}</div>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? '注册中…' : '注册并登录'}
          </button>

          <div className="border-t border-slate-100 pt-3 text-center text-[12px] text-slate-500">
            已有账号? <Link href="/login" className="text-blue-600 hover:underline">去登录</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
