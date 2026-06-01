import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import './globals.css';
import { getSession } from '@/lib/auth-session';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'PIA Forge — 合规人自己的开放数据中台',
  description:
    'PIA · Audit · Filing · Notice · Incident — 5 个 module · 1 个底座 · 3 层开放接口（Skill Pack / MCP / REST API）',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const h = headers();
  const pathname = h.get('x-invoke-path') ?? h.get('referer') ?? '';
  const isAuthPage = pathname.includes('/login') || pathname.includes('/signup');

  // 协作中心红点 · 我的任务(未完成) + 待我审阅(PENDING)
  let taskCount = 0;
  let reviewCount = 0;
  if (session) {
    try {
      const [t, r] = await Promise.all([
        db.assignment.count({
          where: {
            organizationId: session.organizationId,
            assigneeUserId: session.userId,
            status: { in: ['TODO', 'IN_PROGRESS', 'AWAITING_REVIEW'] },
          },
        }),
        db.reviewRequest.count({
          where: {
            organizationId: session.organizationId,
            reviewerUserId: session.userId,
            status: 'PENDING',
          },
        }),
      ]);
      taskCount = t;
      reviewCount = r;
    } catch {
      // schema 未应用时静默 fallback
    }
  }

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen antialiased font-sans bg-[#FAFBFD] bg-[radial-gradient(ellipse_120%_55%_at_50%_-10%,_#E5EEFF_0%,_transparent_55%)] text-slate-900">
        <header className="sticky top-0 z-30 surface-glass border-b border-slate-200/60">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="inline-block h-7 w-7 rounded-[9px] bg-[linear-gradient(135deg,_#5B8DEF_0%,_#3D7BFF_55%,_#2563EB_100%)] shadow-sm shadow-blue-200/50" />
              <span className="text-[15px] font-semibold tracking-tight">PIA Forge</span>
            </Link>
            {session ? (
              <nav className="flex items-center gap-0.5 text-[13px]">
                <NavLink href="/projects">评估</NavLink>
                <NavLink href="/library">法规库</NavLink>
                <NavLink href="/architecture">架构</NavLink>
                <NavLink href="/integrations">接入 Agent</NavLink>
                <NavLink href="/my-tasks" badge={taskCount}>我的任务</NavLink>
                <NavLink href="/my-reviews" badge={reviewCount}>待我审阅</NavLink>
                <NavLink href="/settings">设置</NavLink>
                <UserMenu name={session.name ?? session.email} email={session.email} />
              </nav>
            ) : (
              <nav className="flex items-center gap-2 text-[13px]">
                <a
                  href="https://github.com/juejiangxiaopianzi/pia-forge"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-slate-500 ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-900"
                >
                  GitHub
                </a>
                <Link href="/login" className="btn-primary text-[12px]">登录</Link>
              </nav>
            )}
          </div>
        </header>
        <main className="container py-10">{children}</main>
        <footer className="mt-20 border-t border-slate-200/60 bg-white/40 backdrop-blur">
          <div className="container py-8 text-[11px] text-slate-500">
            PIA Forge · MIT License · 依据 PIPL §55-56 / GB/T 39335-2020 / 数据出境安全评估办法 / GB/T 45574-2025
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children, badge }: { href: string; children: React.ReactNode; badge?: number }) {
  return (
    <Link href={href} className="inline-flex items-center rounded-lg px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100/60 hover:text-slate-900">
      {children}
      {badge && badge > 0 ? (
        <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function UserMenu({ name, email }: { name: string; email: string }) {
  return (
    <div className="group relative ml-2">
      <button className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[12px] font-medium text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100">
        <span className="inline-block h-5 w-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-center text-[10px] font-bold leading-5 text-white">
          {name.charAt(0).toUpperCase()}
        </span>
        <span>{name}</span>
      </button>
      <div className="invisible absolute right-0 top-full z-40 mt-1 w-56 rounded-xl bg-white p-2 opacity-0 shadow-lg ring-1 ring-slate-200 transition group-hover:visible group-hover:opacity-100">
        <div className="border-b border-slate-100 px-3 pb-2 pt-1">
          <p className="text-[12px] font-medium text-slate-900">{name}</p>
          <p className="text-[10px] text-slate-500">{email}</p>
        </div>
        <Link href="/settings/invites" className="block rounded-lg px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50">
          邀请同事 ↗
        </Link>
        <Link href="/settings" className="block rounded-lg px-3 py-2 text-[12px] text-slate-700 hover:bg-slate-50">
          设置
        </Link>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-red-50 hover:text-red-700">
            退出登录
          </button>
        </form>
      </div>
    </div>
  );
}
