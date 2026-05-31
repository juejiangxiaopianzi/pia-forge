/**
 * 极小的 markdown → React 渲染器(零依赖)
 * 支持: # ## ### · 段落 · 列表(- / 1.) · `code` · **bold** · *italic* · [link](url) · > 引用 · --- · 简易表格 · ``` 代码块
 * 不追求 CommonMark 完备 · 够 PIA Forge 内部条款/解读/纪要可读即可
 */

import React from 'react';

type Block =
  | { kind: 'h1' | 'h2' | 'h3' | 'h4'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'hr' }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'code'; lang: string; text: string }
  | { kind: 'table'; rows: string[][] };

function tokenize(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // 代码块
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push({ kind: 'code', lang, text: buf.join('\n') });
      continue;
    }
    // 分隔线
    if (/^---+\s*$/.test(line)) {
      out.push({ kind: 'hr' });
      i++;
      continue;
    }
    // 标题
    const h = /^(#{1,4})\s+(.+)$/.exec(line);
    if (h) {
      out.push({ kind: (`h${h[1].length}` as any), text: h[2].trim() });
      i++;
      continue;
    }
    // 引用
    if (line.startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        buf.push(lines[i].slice(2));
        i++;
      }
      out.push({ kind: 'quote', text: buf.join(' ') });
      continue;
    }
    // 列表
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      out.push({ kind: 'ul', items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      out.push({ kind: 'ol', items });
      continue;
    }
    // 表格(简易 · 头一行 + 分隔行 + 内容)
    if (line.includes('|') && i + 1 < lines.length && /^[\s|:-]+$/.test(lines[i + 1])) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        if (/^[\s|:-]+$/.test(lines[i])) {
          i++;
          continue;
        }
        rows.push(
          lines[i]
            .replace(/^\||\|$/g, '')
            .split('|')
            .map((c) => c.trim()),
        );
        i++;
      }
      out.push({ kind: 'table', rows });
      continue;
    }
    // 空行
    if (line.trim() === '') {
      i++;
      continue;
    }
    // 段落(允许跨行)
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,4}\s|>\s|---+\s*$|[-*]\s|\d+\.\s|```)/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push({ kind: 'p', text: buf.join(' ') });
  }
  return out;
}

function inline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  // 正则按出现顺序贪婪匹配
  const re = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > cursor) parts.push(text.slice(cursor, m.index));
    if (m[1]) parts.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3]) parts.push(<code key={key++} className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] text-slate-700">{m[4]}</code>);
    else if (m[5]) parts.push(<em key={key++}>{m[6]}</em>);
    else if (m[7])
      parts.push(
        <a key={key++} href={m[9]} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          {m[8]}
        </a>,
      );
    cursor = m.index + m[0].length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export function MarkdownView({ source }: { source: string }) {
  const blocks = tokenize(source ?? '');
  return (
    <div className="space-y-3 text-[13px] leading-relaxed text-slate-700">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'h1':
            return (
              <h1 key={i} className="mt-4 text-[22px] font-semibold tracking-tight text-slate-900">
                {inline(b.text)}
              </h1>
            );
          case 'h2':
            return (
              <h2 key={i} className="mt-4 text-[17px] font-semibold tracking-tight text-slate-900">
                {inline(b.text)}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={i} className="mt-3 text-[14px] font-semibold text-slate-800">
                {inline(b.text)}
              </h3>
            );
          case 'h4':
            return (
              <h4 key={i} className="mt-3 text-[13px] font-semibold uppercase tracking-wider text-slate-600">
                {inline(b.text)}
              </h4>
            );
          case 'p':
            return <p key={i}>{inline(b.text)}</p>;
          case 'quote':
            return (
              <blockquote key={i} className="rounded-r-lg border-l-2 border-l-blue-500 bg-blue-50/40 px-3 py-2 text-[12px] text-slate-600">
                {inline(b.text)}
              </blockquote>
            );
          case 'hr':
            return <hr key={i} className="my-4 border-slate-200" />;
          case 'ul':
            return (
              <ul key={i} className="list-disc space-y-1 pl-5">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="list-decimal space-y-1 pl-5">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ol>
            );
          case 'code':
            return (
              <pre key={i} className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-[12px] text-slate-100">
                <code>{b.text}</code>
              </pre>
            );
          case 'table':
            return (
              <div key={i} className="overflow-x-auto">
                <table className="w-full border border-slate-200 text-[12px]">
                  <thead className="bg-slate-50">
                    <tr>
                      {b.rows[0]?.map((c, j) => (
                        <th key={j} className="border border-slate-200 px-3 py-2 text-left font-semibold">
                          {inline(c)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.slice(1).map((row, j) => (
                      <tr key={j} className="even:bg-slate-50/30">
                        {row.map((c, k) => (
                          <td key={k} className="border border-slate-200 px-3 py-2">
                            {inline(c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
