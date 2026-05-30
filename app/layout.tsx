import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'PIA Forge — 个人信息保护影响评估工作台',
  description:
    'Open-source PIA workbench. PIPL §55-56 / GB/T 39335-2020 / 数据出境安全评估办法 / GB/T 45574-2025 compliant.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <header className="border-b bg-white">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-block h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500" />
              <span className="text-lg font-semibold">PIA Forge</span>
              <span className="rounded bg-violet-50 px-2 py-0.5 text-xs text-violet-700">v0.1 · 开源</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/projects" className="hover:text-foreground">评估项目</Link>
              <Link href="/library" className="hover:text-foreground">合规法规库</Link>
              <Link href="/about" className="hover:text-foreground">关于</Link>
              <a
                href="https://github.com/juejiangxiaopianzi/pia-forge"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="container py-10">{children}</main>
        <footer className="border-t bg-gray-50">
          <div className="container py-6 text-xs text-muted-foreground">
            PIA Forge · MIT License · 依据 PIPL §55-56 / GB/T 39335-2020 / 数据出境安全评估办法 / GB/T 45574-2025
          </div>
        </footer>
      </body>
    </html>
  );
}
