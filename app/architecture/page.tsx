import Link from 'next/link';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ArchitecturePage() {
  // 用真实数据装填四层关系
  const [projects, orgSources, kbs, indexes, agents, sources] = await Promise.all([
    db.piaProject.count(),
    db.source.count({ where: { scope: { in: ['ORG', 'TEAM'] } } }),
    db.knowledgeBase.findMany({ select: { id: true, name: true, type: true, uri: true, scope: true } }),
    db.knowledgeIndex.count(),
    db.agent.findMany({ where: { status: 'ACTIVE' }, select: { id: true, displayName: true } }),
    db.source.count(),
  ]);
  const laws = orgSources;

  return (
    <div className="max-w-5xl space-y-12">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">系统架构</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">PIA Forge 与你的 4 层知识 / 记忆体系</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-slate-500">
          这是一份给「合规人 + 她的 Agent」的关系图。它告诉你: 哪些东西放哪里 / 谁在维护 / Agent 怎么用 / 数据怎么不流失。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Layer
          color="blue"
          tag="L1 · 操作层"
          title="PIA Forge 本系统"
          body="存评估过程数据(项目/风险/控制/结论/RACI/审计日志/字段修订/思考链/引用关系)。这是合规人最频繁打交道的层，也是 5 个 module 共享的底座。"
          stats={[
            { label: '评估项目', value: projects },
            { label: '法规条款', value: laws },
            { label: '引用源 Source', value: sources },
            { label: '知识索引', value: indexes },
          ]}
          actions={[
            { label: '看评估项目', href: '/projects' },
            { label: '看法规库', href: '/library' },
          ]}
        />

        <Arrow text="评估时按需引用 ↓ 通过 CitationLink 绑定 commit SHA · 永不失链" />

        <Layer
          color="emerald"
          tag="L2 · 公共知识层"
          title="法规库 + 知识索引(本系统内)"
          body="官方法规(PIPL/GB/T/评估办法) + 公司内部规章 + 知识索引(『这事在哪/找谁问』的路由)。这层会跨多个评估复用，写一次到处引。Agent 写定性依据前必须先 list_legal_references 拿条款 code。"
          stats={[
            { label: '法规条款', value: laws },
            { label: '路由索引', value: indexes },
            { label: 'Agent 数', value: agents.length },
          ]}
          actions={[
            { label: '管理法规库', href: '/library' },
            { label: '索引(MCP)', href: '/integrations' },
          ]}
        />

        <Arrow text="不存原文，只存「在哪/SHA/摘录」 ↓ 真正的原始知识在外部" />

        <Layer
          color="violet"
          tag="L3 · 私有知识层"
          title="你的私有知识库(GitHub Private + 飞书原始空间)"
          body="原始论证文档、判例、内审记录、客户沟通记录、出境申报底稿。**不进 PIA Forge 数据库**，只在这里维护，永远是你最高价值的私有资产。PIA Forge 通过 Source 指针 + 摘录 + commit SHA 引用。"
          customBody={
            kbs.length === 0 ? (
              <p className="text-[12px] text-slate-400">尚未配置连接 → <Link href="/settings/knowledge-bases" className="text-blue-600 hover:underline">去配置</Link></p>
            ) : (
              <ul className="space-y-1 text-[12px]">
                {kbs.map((kb) => (
                  <li key={kb.id} className="flex items-center gap-2">
                    <span className="chip-blue text-[10px]">{kb.type}</span>
                    <span className="font-medium text-slate-700">{kb.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{kb.uri}</span>
                    <span className="text-[10px] text-slate-400">[{kb.scope}]</span>
                  </li>
                ))}
              </ul>
            )
          }
          actions={[
            { label: '管理知识库连接', href: '/settings/knowledge-bases' },
          ]}
        />

        <Arrow text="按需读取 + 摘录 ↓ Agent 拿到 PAT/SSH 凭证后可直接访问" />

        <Layer
          color="amber"
          tag="L4 · Agent 临时记忆层"
          title="Agent 自己的工作记忆 / 上下文窗口"
          body="你的 Agent(Claude Code / Cursor / Custom)每次对话/任务的临时缓存。Agent 在每个评估任务开始时按需从 L1-L3 拉取片段。任务结束后回写 FieldRevision + reasoning chain 到 L1，把会沉淀的知识固化到 L2/L3，让自己变更聪明。"
          customBody={
            <div className="space-y-2 text-[12px]">
              <p className="font-semibold text-slate-700">本组织已激活 Agent:</p>
              <ul className="space-y-1">
                {agents.length === 0 && <li className="text-slate-400">还没有 Agent。先去 /settings/agents 添加</li>}
                {agents.map((a) => (
                  <li key={a.id} className="flex items-center gap-2">
                    <span>🤖</span>
                    <span className="font-medium">{a.displayName}</span>
                    <span className="font-mono text-[10px] text-slate-400">{a.id}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-slate-500">
                Agent 通过 MCP(模型上下文协议) 或 REST API 连接 PIA Forge。每次写入都会留下 Actor 标识 + 思考链。
              </p>
            </div>
          }
          actions={[
            { label: '管理 Agent', href: '/settings/agents' },
            { label: '看接入文档', href: '/integrations' },
          ]}
        />
      </div>

      <section className="card-soft p-6">
        <h2 className="text-[18px] font-semibold tracking-tight">沉淀方式 · 一次评估走完后留下什么</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 text-[12px] leading-relaxed">
          <Box title="在 L1 (PIA Forge)">
            <ul className="list-disc space-y-1 pl-4 text-slate-600">
              <li>评估项目 + 风险 + 控制 + 结论的完整结构化数据</li>
              <li>每一次字段变更的 FieldRevision (谁改的 / 改了什么 / 为什么)</li>
              <li>Agent 起草时的 reasoning 链 (read / considered / chose / why)</li>
              <li>AuditLog 不可篡改流水</li>
              <li>CitationLink 把判断绑到法规 / 私有 KB 文档的 commit SHA</li>
            </ul>
          </Box>
          <Box title="在 L2 (法规库)">
            <ul className="list-disc space-y-1 pl-4 text-slate-600">
              <li>本次评估新触及的法规条款 → 入库可被未来评估复用</li>
              <li>客户/监管提到的新规要点 → Agent 主动 create_legal_reference</li>
              <li>知识索引 ("这事下次去哪找") hitCount + lastHitAt 自动累计</li>
            </ul>
          </Box>
          <Box title="在 L3 (私有 KB)">
            <ul className="list-disc space-y-1 pl-4 text-slate-600">
              <li>新写的论证文档 / 判例笔记 → push 到 GitHub Private repo</li>
              <li>飞书原始空间持续更新 → 通过 bootstrap/sync 同步到 GitHub</li>
              <li>Commit SHA 绑定后，本系统引用就永不失链</li>
            </ul>
          </Box>
          <Box title="在 L4 (Agent 记忆)">
            <ul className="list-disc space-y-1 pl-4 text-slate-600">
              <li>本次评估遇到的判定逻辑 → 写入 Agent skills / system prompt</li>
              <li>下次同类问题 Agent 跳过查询直接套用</li>
              <li>Agent 越用越懂你的判断口径 → AgentSnapshot 版本化追踪</li>
            </ul>
          </Box>
        </div>
      </section>

      <section className="card-soft border-l-2 border-l-blue-500 p-6 text-[12px] leading-relaxed">
        <h3 className="text-[15px] font-semibold text-slate-800">三条不可让步的边界</h3>
        <ul className="mt-3 list-decimal space-y-2 pl-5 text-slate-600">
          <li><span className="font-semibold text-slate-800">PIA Forge 不带 LLM</span> · 你自己的 Agent 用你信任的模型(Claude / GPT / Kimi / 自部署)，本系统只做数据底座 + 开放接口</li>
          <li><span className="font-semibold text-slate-800">私有知识库不进本系统数据库</span> · 原文永远留在 L3，本系统只存指针 + 摘录 + commit SHA。这样你的私有知识能跨多个合规系统共享，也不被 SaaS 绑架</li>
          <li><span className="font-semibold text-slate-800">每次写入都要留下 Actor 身份</span> · 不知道是谁写的就拒绝写入。Agent 的写入额外带 reasoning chain，可被独立评估</li>
        </ul>
      </section>
    </div>
  );
}

function Layer({
  color,
  tag,
  title,
  body,
  stats,
  actions,
  customBody,
}: {
  color: 'blue' | 'emerald' | 'violet' | 'amber';
  tag: string;
  title: string;
  body: string;
  stats?: Array<{ label: string; value: number }>;
  actions?: Array<{ label: string; href: string }>;
  customBody?: React.ReactNode;
}) {
  const accent: Record<string, string> = {
    blue: 'border-l-blue-500 bg-blue-50/40',
    emerald: 'border-l-emerald-500 bg-emerald-50/40',
    violet: 'border-l-violet-500 bg-violet-50/40',
    amber: 'border-l-amber-500 bg-amber-50/40',
  };
  const tagCls: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    violet: 'bg-violet-100 text-violet-800',
    amber: 'bg-amber-100 text-amber-800',
  };
  return (
    <article className={`card-soft border-l-4 p-6 ${accent[color]}`}>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tagCls[color]}`}>{tag}</span>
        <h2 className="text-[17px] font-semibold text-slate-900">{title}</h2>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{body}</p>

      {customBody && <div className="mt-3">{customBody}</div>}

      {stats && stats.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-white/70 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {actions && actions.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-[11px]">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className="rounded-lg bg-white/70 px-3 py-1.5 font-medium text-slate-700 hover:bg-white">
              {a.label} →
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}

function Arrow({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-1 text-[11px] text-slate-400">
      <span className="rounded-full bg-slate-100 px-3 py-1">{text}</span>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
