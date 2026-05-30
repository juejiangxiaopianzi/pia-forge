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
      <body className="min-h-screen bg-background antialiased font-sans">
        <header className="sticky top-0 z-30 border-b bg-white/85 backdrop-blur-lg">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="inline-block h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-sm shadow-violet-200" />
              <span className="text-base font-semibold tracking-tight">PIA Forge</span>
              <span className="hidden rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 md:inline">合规人开放数据中台 · v0.1</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/projects">评估项目</NavLink>
              <NavLink href="/library">法规库</NavLink>
              <NavLink href="/integrations">接入 Agent</NavLink>
              <NavLink href="/settings">设置</NavLink>
              <a
                href="https://github.com/juejiangxiaopianzi/pia-forge"
                target="_blank"
                rel="noreferrer"
                className="ml-2 rounded-lg border bg-white px-3 py-1.5 text-xs hover:bg-gray-50"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="container py-10">{children}</main>
        <footer className="border-t bg-gray-50">
          <div className="container py-6 text-xs text-muted-foreground">
            PIA Forge · MIT License · 5 个 module · 3 层开放接口（Skill / MCP / REST API）·
            依据 PIPL §55-56 / GB/T 39335-2020 / 数据出境安全评估办法 / GB/T 45574-2025
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg px-3 py-1.5 text-muted-foreground transition hover:bg-gray-100 hover:text-foreground">
      {children}
    </Link>
  );
}
