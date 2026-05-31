import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'PIA Forge — 合规人自己的开放数据中台',
  description:
    'PIA · Audit · Filing · Notice · Incident — 5 个 module · 1 个底座 · 3 层开放接口（Skill Pack / MCP / REST API）',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen antialiased font-sans bg-[#FAFBFD] bg-[radial-gradient(ellipse_120%_55%_at_50%_-10%,_#E5EEFF_0%,_transparent_55%)] text-slate-900">
        <header className="sticky top-0 z-30 surface-glass border-b border-slate-200/60">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="inline-block h-7 w-7 rounded-[9px] bg-[linear-gradient(135deg,_#5B8DEF_0%,_#3D7BFF_55%,_#2563EB_100%)] shadow-sm shadow-blue-200/50" />
              <span className="text-[15px] font-semibold tracking-tight">PIA Forge</span>
            </Link>
            <nav className="flex items-center gap-0.5 text-[13px]">
              <NavLink href="/projects">评估</NavLink>
              <NavLink href="/library">法规库</NavLink>
              <NavLink href="/integrations">接入 Agent</NavLink>
              <NavLink href="/settings">设置</NavLink>
              <a
                href="https://github.com/juejiangxiaopianzi/pia-forge"
                target="_blank"
                rel="noreferrer"
                className="ml-2 rounded-lg px-3 py-1.5 text-[12px] font-medium text-slate-500 ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-900"
              >
                GitHub
              </a>
            </nav>
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

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100/60 hover:text-slate-900">
      {children}
    </Link>
  );
}
