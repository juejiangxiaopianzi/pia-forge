import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function IntegrationsPage() {
  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">Integrations</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">把你的 Agent 接进来</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-500">
          PIA Forge 提供三层开放接口,任选一层接进来。
          你的 Agent 干完活后把结构化数据写回 PIA Forge,团队能看 · 监管能审 · 系统会自动留痕。
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card
          tag="第 ① 层"
          title="Skill Pack"
          desc="为你的 Agent 打包好的工作流：会议纪要→PIA 草案、审计 finding→整改项、客诉→事件响应。Claude Code / Cursor 即装即用。"
          docHref="https://github.com/juejiangxiaopianzi/pia-forge/tree/main/skills"
          cta="查看 Skill 列表"
        />
        <Card
          tag="第 ② 层"
          title="MCP Server"
          desc="原生 Model Context Protocol 接口。Claude Desktop / Cursor / Claude Code 配一行 URL 就能用。9 个 tools + 5 个 resources。"
          docHref="https://github.com/juejiangxiaopianzi/pia-forge/blob/main/docs/mcp.md"
          cta="MCP 接入指南"
        />
        <Card
          tag="第 ③ 层"
          title="REST API v1"
          desc="Bearer Token 鉴权 · 朴素 RESTful · 任何脚本 / curl / 第三方系统都能调。"
          docHref="https://github.com/juejiangxiaopianzi/pia-forge/blob/main/docs/api.md"
          cta="REST API 文档"
        />
      </section>

      <section className="card-soft p-6">
        <h2 className="text-base font-medium">3 步上手</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">① 生成一个 API Token</strong> —— 去 <Link href="/settings/tokens" className="text-blue-700 hover:underline">设置 → API Tokens</Link>，给你的 Agent 颁一个。Token 只在生成时显示一次。
          </li>
          <li>
            <strong className="text-foreground">② 选一层接入方式</strong>
            <ul className="ml-4 mt-1 list-disc space-y-1 text-xs">
              <li>用 Claude Code / Claude Desktop / Cursor → 走 MCP（最丝滑）</li>
              <li>用自己的脚本 / 公司系统 → 走 REST API</li>
              <li>想让 Agent 学最佳实践 → 装 Skill Pack</li>
            </ul>
          </li>
          <li>
            <strong className="text-foreground">③ 让 Agent 干活</strong> —— 让 Agent 把会议纪要 / PRD / 法规要求 / 客户问题处理成评估，写回 PIA Forge。
          </li>
        </ol>
      </section>

      <section className="card-soft p-6">
        <h2 className="text-base font-medium">为什么没有「自带 AI」</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          每个合规人都已经有自己的 Agent（Claude Code / Cursor / 公司内部 GPT / 自建 Agent）。
          PIA Forge 内置一个 LLM 会和你已有 Agent 抢位置，浪费你的额度也浪费你的心智模型。
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          所以 PIA Forge 选择做你看不见的底座 —— 把 Agent 干完的活儿沉淀为结构化资产，团队、监管、CTO 都能看懂。
          这才是数据中台该做的事。
        </p>
      </section>
    </div>
  );
}

function Card({ tag, title, desc, docHref, cta }: { tag: string; title: string; desc: string; docHref: string; cta: string }) {
  return (
    <div className="card-soft card-hover p-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-blue-500">{tag}</p>
      <h3 className="mt-2 text-[14px] font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-[12px] leading-relaxed text-slate-500">{desc}</p>
      <a
        href={docHref}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-block text-[11px] font-medium text-blue-600 hover:text-blue-700"
      >
        {cta} →
      </a>
    </div>
  );
}
