'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setPending(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setErr(d.error ?? '登录失败');
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="inline-block h-10 w-10 rounded-[12px] bg-[linear-gradient(135deg,_#5B8DEF_0%,_#3D7BFF_55%,_#2563EB_100%)] shadow-md shadow-blue-200/50" />
          <h1 className="mt-3 text-[22px] font-semibold tracking-tight">登录 PIA Forge</h1>
          <p className="mt-1 text-[12px] text-slate-500">合规人开放数据中台</p>
        </div>

        <form onSubmit={submit} className="card-soft space-y-4 p-6">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none"
            />
          </div>

          {err && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{err}</div>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? '登录中…' : '登录'}
          </button>

          <div className="border-t border-slate-100 pt-3 text-center text-[12px] text-slate-500">
            没账号? 有邀请码 → <Link href="/signup" className="text-blue-600 hover:underline">去注册</Link>
          </div>
        </form>

        <p className="mt-4 text-center text-[10px] text-slate-400">
          自部署 · 开源 · MIT License · juejiangxiaopianzi/pia-forge
        </p>
      </div>
    </div>
  );
}
