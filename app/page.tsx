import Link from 'next/link';
import { db } from '@/lib/db';
import { riskValue, riskLevelOf, RISK_LEVEL_LABEL, RISK_LEVEL_COLOR } from '@/lib/risk';

export const dynamic = 'force-dynamic';

const MODULES: { type: any; label: string; desc: string; status: 'live' | 'plan'; statusText: string; dot: string }[] = [
  { type: 'PIA',      label: 'PIA',      desc: '个人信息保护影响评估',  status: 'live', statusText: '已上线',   dot: 'bg-blue-500' },
  { type: 'AUDIT',    label: 'Audit',    desc: '合规审计',              status: 'plan', statusText: 'v0.2',     dot: 'bg-slate-300' },
  { type: 'FILING',   label: 'Filing',   desc: '申报与备案台账',        status: 'plan', statusText: 'v0.3',     dot: 'bg-slate-300' },
  { type: 'NOTICE',   label: 'Notice',   desc: '告知与同意版本',        status: 'plan', statusText: 'v0.4',     dot: 'bg-slate-300' },
  { type: 'INCIDENT', label: 'Incident', desc: '事件响应',              status: 'plan', statusText: 'v0.5',     dot: 'bg-slate-300' },
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
    <div className="space-y-16">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden rounded-[28px] bg-white ring-1 ring-slate-200/60" style={{ boxShadow: 'var(--shadow-md)' }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, #FFFFFF 0%, #F4F8FF 45%, #E2EBFE 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, #93B4FF 0%, transparent 70%)' }}
        />
        <div className="relative max-w-3xl px-10 py-14 space-y-6">
          <div className="chip-blue">合规人开放数据中台 · v0.1</div>
          <h1 className="text-[42px] font-semibold tracking-tight leading-[1.1]">
            把零散的合规判断,
            <br />
            <span className="text-slate-500 font-normal">沉淀成可签字的结构化资产。</span>
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-slate-600">
            PIA Forge 不带 LLM,不抢 Agent。5 个 module 共用一套底座,
            3 层开放接口让你的 Agent 把活儿干完后,落到这里。
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/projects/new" className="btn-primary">新建评估项目</Link>
            <Link href="/settings/tokens" className="btn-ghost">生成 API Token</Link>
            <a
              href="https://github.com/juejiangxiaopianzi/pia-forge"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              GitHub →
            </a>
          </div>
        </div>
      </section>

      {/* ─── Modules ─── */}
      <section>
        <div className="mb-5 flex items-baseline justify-between">
          <div>
            <h2 className="text-[15px] font-medium text-slate-900">5 个 Module · 1 个底座</h2>
            <p className="mt-0.5 text-xs text-slate-500">所有 module 共用评估对象 / 角色 / 风险 / 措施 / 签字 / 留痕</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {MODULES.map((m) => {
            const c = moduleCounts.find((x) => x.assessmentType === m.type)?._count._all ?? 0;
            return (
              <div key={m.type} className="card-soft card-hover p-5">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${m.dot}`} />
                  <p className="text-[13px] font-semibold text-slate-900">{m.label}</p>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{m.desc}</p>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-2xl font-semibold tabular-nums text-slate-900">{c}</span>
                  <span className="text-[10px] text-slate-400">{m.statusText}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 3 Layers ─── */}
      <section>
        <div className="mb-5">
          <h2 className="text-[15px] font-medium text-slate-900">3 层开放接口</h2>
          <p className="mt-0.5 text-xs text-slate-500">任选一层,把你的 Agent 接进来 · 数据始终在你的服务器</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <InterfaceCard
            no="01"
            title="Skill Pack"
            desc="为你的 Agent 打包好的工作流。Claude Code / Cursor 即装即用。"
            href="https://github.com/juejiangxiaopianzi/pia-forge/tree/main/skills"
          />
          <InterfaceCard
            no="02"
            title="MCP Server"
            desc="原生 Model Context Protocol 接口。9 个 tools + 5 个 resources。"
            href="https://github.com/juejiangxiaopianzi/pia-forge/blob/main/docs/mcp.md"
          />
          <InterfaceCard
            no="03"
            title="REST API v1"
            desc="Bearer Token 鉴权 · 朴素 CRUD · 任何东西都能接。"
            href="https://github.com/juejiangxiaopianzi/pia-forge/blob/main/docs/api.md"
          />
        </div>
      </section>

      {/* ─── Recent ─── */}
      <section>
        <div className="mb-5 flex items-baseline justify-between">
          <div>
            <h2 className="text-[15px] font-medium text-slate-900">最近评估项目</h2>
            <p className="mt-0.5 text-xs text-slate-500">{projects.length} 个</p>
          </div>
          <Link href="/projects" className="text-xs font-medium text-blue-600 hover:text-blue-700">查看全部 →</Link>
        </div>
        {projects.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center text-sm text-slate-500 ring-1 ring-slate-200/60 ring-dashed">
            还没有评估项目。<Link href="/projects/new" className="text-blue-600 hover:underline">创建第一个 →</Link>
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
                  className="card-soft card-hover block p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-blue-600">
                        <span>{p.assessmentType}</span>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono text-slate-400">{p.code}</span>
                      </div>
                      <h3 className="mt-1 truncate text-[15px] font-medium text-slate-900">{p.title}</h3>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] ${RISK_LEVEL_COLOR[p.residualLevel]}`}>
                      残余 · {RISK_LEVEL_LABEL[p.residualLevel]}
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-4 gap-2 text-center">
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
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <div className="text-base font-semibold tabular-nums text-slate-900">{value}</div>
      <div className="mt-0.5 text-[10px] text-slate-500">{label}</div>
      {sub && <div className="text-[10px] text-rose-500">{sub}</div>}
    </div>
  );
}

function InterfaceCard({ no, title, desc, href }: { no: string; title: string; desc: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="card-soft card-hover block p-5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] font-semibold text-blue-500">{no}</span>
        <p className="text-[13px] font-semibold text-slate-900">{title}</p>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-slate-500">{desc}</p>
      <p className="mt-4 text-[11px] font-medium text-blue-600">查看文档 →</p>
    </a>
  );
}
