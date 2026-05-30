import Link from 'next/link';
import { db } from '@/lib/db';
import { riskValue, riskLevelOf, RISK_LEVEL_LABEL, RISK_LEVEL_COLOR } from '@/lib/risk';

export const dynamic = 'force-dynamic';

const MODULES = [
  { type: 'PIA', label: 'PIA', desc: '个人信息保护影响评估', status: 'v0.1 · 已上线', accent: 'bg-violet-500' },
  { type: 'AUDIT', label: 'Audit', desc: '合规审计', status: 'v0.2 · 规划中', accent: 'bg-blue-500' },
  { type: 'FILING', label: 'Filing', desc: '申报与备案台账', status: 'v0.3 · 规划中', accent: 'bg-teal-500' },
  { type: 'NOTICE', label: 'Notice', desc: '告知与同意版本', status: 'v0.4 · 规划中', accent: 'bg-amber-500' },
  { type: 'INCIDENT', label: 'Incident', desc: '事件响应', status: 'v0.5 · 规划中', accent: 'bg-rose-500' },
];

export default async function HomePage() {
  const projects = await db.piaProject.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { dataItems: true, scenarios: true, risks: true, mitigations: true } },
      risks: { select: { likelihood: true, severity: true } },
    },
  });

  const moduleCounts = await db.piaProject.groupBy({
    by: ['assessmentType'],
    _count: { _all: true },
  });

  return (
    <div className="space-y-12">
      <section className="rounded-3xl border bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-10 shadow-sm">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-medium tracking-widest text-violet-700">
            COMPLIANCE PROFESSIONAL'S OPEN DATA BACKBONE
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            把零散的合规判断 · 沉淀成可签字的结构化资产。
          </h1>
          <p className="text-base text-muted-foreground">
            PIA Forge 不带 LLM · 不抢 Agent · 只做合规人自己的底座。
            5 个 module 共用一套底座，3 层开放接口让你的 Agent 把活儿干完后落到这里。
          </p>
          <div className="flex gap-3 pt-2">
            <Link
              href="/projects/new"
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-violet-200 transition hover:bg-violet-700"
            >
              新建评估项目
            </Link>
            <Link
              href="/settings/tokens"
              className="rounded-xl border bg-white px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              生成 API Token
            </Link>
            <a
              href="https://github.com/juejiangxiaopianzi/pia-forge"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              GitHub →
            </a>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-medium text-muted-foreground">5 个 Module · 1 个底座</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {MODULES.map((m) => {
            const c = moduleCounts.find((x) => x.assessmentType === m.type)?._count._all ?? 0;
            return (
              <div key={m.type} className="rounded-2xl border bg-white p-5 transition hover:shadow-sm">
                <div className={`mb-3 h-1 w-8 rounded-full ${m.accent}`} />
                <p className="text-sm font-semibold">{m.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.desc}</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-xl font-semibold tabular-nums">{c}</span>
                  <span className="text-[10px] text-muted-foreground">{m.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-medium text-muted-foreground">3 层开放接口</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <InterfaceCard
            title="Skill Pack"
            desc="挂到 Agent 上就懂怎么用 PIA Forge。Claude Code / Cursor 即装即用。"
            href="https://github.com/juejiangxiaopianzi/pia-forge/tree/main/skills"
          />
          <InterfaceCard
            title="MCP Server"
            desc="JSON-RPC over HTTP · 给 LLM Agent 用的原生协议。9 个 tools + 5 个 resources。"
            href="https://github.com/juejiangxiaopianzi/pia-forge/blob/main/docs/mcp.md"
          />
          <InterfaceCard
            title="REST API v1"
            desc="Bearer Token 鉴权 · 朴素 CRUD · 脚本 / curl / 第三方系统都能接。"
            href="https://github.com/juejiangxiaopianzi/pia-forge/blob/main/docs/api.md"
          />
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-base font-medium text-muted-foreground">最近评估项目</h2>
          <Link href="/projects" className="text-xs text-violet-700 hover:underline">查看全部 →</Link>
        </div>
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            还没有评估项目。<Link href="/projects/new" className="text-violet-600 hover:underline">创建第一个 →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {projects.slice(0, 6).map((p) => {
              const highCount = p.risks.filter((r) => {
                const lv = riskLevelOf(riskValue(r.likelihood, r.severity));
                return lv === 'HIGH';
              }).length;
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="rounded-2xl border bg-white p-5 transition hover:border-violet-300 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-violet-700">
                        {p.assessmentType} · {p.code}
                      </p>
                      <h3 className="mt-1 text-base font-medium">{p.title}</h3>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${RISK_LEVEL_COLOR[p.residualLevel]}`}>
                      残余 · {RISK_LEVEL_LABEL[p.residualLevel]}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <Stat label="信息项" value={p._count.dataItems} />
                    <Stat label="场景" value={p._count.scenarios} />
                    <Stat label="风险" value={p._count.risks} sub={highCount > 0 ? `高 ${highCount}` : undefined} />
                    <Stat label="措施" value={p._count.mitigations} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] text-red-500">{sub}</div>}
    </div>
  );
}

function InterfaceCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block rounded-2xl border bg-white p-5 transition hover:border-violet-300 hover:shadow-sm"
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-xs text-muted-foreground">{desc}</p>
      <p className="mt-4 text-xs text-violet-700">查看文档 →</p>
    </a>
  );
}
