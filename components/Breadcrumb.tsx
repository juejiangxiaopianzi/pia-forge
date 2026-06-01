import Link from 'next/link';

export type Crumb = { label: string; href?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-[12px] text-slate-500" aria-label="Breadcrumb">
      <Link href="/" className="hover:text-slate-900">首页</Link>
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="text-slate-300">/</span>
          {c.href && i < items.length - 1 ? (
            <Link href={c.href} className="hover:text-slate-900">{c.label}</Link>
          ) : (
            <span className="text-slate-900 font-medium truncate max-w-[400px]">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
