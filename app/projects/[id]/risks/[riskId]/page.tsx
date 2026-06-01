import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import {
  riskValue, riskLevelOf, RISK_LEVEL_LABEL, RISK_LEVEL_COLOR,
  IMPACT_DIMENSIONS, LIKELIHOOD_FACTORS,
  GBT_SCORE_LABEL, GBT_SCORE_COLOR,
  gbtLevelLabel, gbtLevelColor,
} from '@/lib/risk';
import { labelsFor } from '@/lib/module-labels';
import { sourceUriToHref } from '@/lib/citations';
import Breadcrumb from '@/components/Breadcrumb';

const CITATION_TYPE_LABEL: Record<string, string> = {
  EVIDENCE: '判断依据',
  DERIVED_FROM: '产出自',
  DISCUSSED_IN: '讨论于',
  SIGNED_OFF_IN: '签字于',
  CONTRADICTED_BY: '冲突来源',
  REFERENCE: '一般参考',
};

const CITATION_TYPE_COLOR: Record<string, string> = {
  EVIDENCE: 'chip-blue',
  DERIVED_FROM: 'chip-green',
  DISCUSSED_IN: 'chip',
  SIGNED_OFF_IN: 'chip-green',
  CONTRADICTED_BY: 'chip-red',
  REFERENCE: 'chip',
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  GITHUB_FILE: 'GitHub',
  FEISHU_DOC: '飞书文档',
  FEISHU_MESSAGE: '飞书消息',
  FEISHU_WIKI: '飞书 Wiki',
  FEISHU_SHEET: '飞书表格',
  FEISHU_BASE: '飞书多维表',
  EMAIL: '邮件',
  FILE: '上传文件',
  URL: '公网 URL',
  AGENT_MEMORY: 'Agent 记忆',
  EXTERNAL_API: '外部 API',
  OTHER: '其他',
};

export const dynamic = 'force-dynamic';

type ReasoningPayload = {
  read?: string[];
  considered?: string[];
  chose?: string;
  why?: string;
  impactReasoning?: Record<string, string>;
  factorReasoning?: Record<string, string>;
};

export default async function RiskDetailPage({
  params,
}: {
  params: { id: string; riskId: string };
}) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();
  const L = labelsFor(project.assessmentType);

  const risk = await db.risk.findUnique({
    where: { id: params.riskId },
    include: {
      dataItems: { select: { id: true, code: true, name: true } },
      scenarios: { select: { id: true, code: true, name: true } },
      mitigations: { select: { id: true, code: true, name: true, status: true } },
    },
  });
  if (!risk) notFound();

  // 取 actor 信息
  const editorAgent = risk.lastEditAgentId
    ? await db.agent.findUnique({
        where: { id: risk.lastEditAgentId },
        include: { owner: { select: { name: true } } },
      })
    : null;
  const editorUser = risk.lastEditUserId
    ? await db.user.findUnique({ where: { id: risk.lastEditUserId }, select: { name: true } })
    : null;

  // 字段修订历史
  const revisions = await db.fieldRevision.findMany({
    where: { resource: 'Risk', resourceId: risk.id },
    orderBy: { createdAt: 'desc' },
  });

  // 引用源(CitationLink + Source)
  const citationLinks = await db.citationLink.findMany({
    where: { fromType: 'Risk', fromId: risk.id },
    orderBy: { citedAt: 'desc' },
    include: { source: true },
  });
  const citedAgentIds = Array.from(new Set(citationLinks.map((c) => c.citedByAgentId).filter(Boolean))) as string[];
  const citedUserIds = Array.from(new Set(citationLinks.map((c) => c.citedByUserId).filter(Boolean))) as string[];
  const citedAgents = citedAgentIds.length
    ? await db.agent.findMany({ where: { id: { in: citedAgentIds } }, select: { id: true, displayName: true } })
    : [];
  const citedUsers = citedUserIds.length
    ? await db.user.findMany({ where: { id: { in: citedUserIds } }, select: { id: true, name: true } })
    : [];
  const citedAgentMap = new Map(citedAgents.map((a) => [a.id, a]));
  const citedUserMap = new Map(citedUsers.map((u) => [u.id, u]));

  // 反查所有 actor
  const allAgentIds = Array.from(
    new Set(revisions.map((r) => r.actorAgentId).filter(Boolean))
  ) as string[];
  const allUserIds = Array.from(
    new Set(revisions.map((r) => r.actorUserId).filter(Boolean))
  ) as string[];
  const allAgents = allAgentIds.length
    ? await db.agent.findMany({
        where: { id: { in: allAgentIds } },
        select: { id: true, displayName: true, owner: { select: { name: true } } },
      })
    : [];
  const allUsers = allUserIds.length
    ? await db.user.findMany({
        where: { id: { in: allUserIds } },
        select: { id: true, name: true },
      })
    : [];
  const agentMap = new Map(allAgents.map((a) => [a.id, a]));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const v = riskValue(risk.likelihood, risk.severity);
  const lv = riskLevelOf(v);

  // GB/T 39335 综合
  const gbtLabel = gbtLevelLabel(risk.impactOverall, risk.likelihoodOverall);
  const gbtColor = gbtLevelColor(risk.impactOverall, risk.likelihoodOverall);

  // 把第一条 revision（创建时）的 reasoning 提取出来
  const initialRevision = revisions[revisions.length - 1]; // 最早一条
  const initialReasoning: ReasoningPayload | null = initialRevision?.reasoning
    ? safeParse(initialRevision.reasoning)
    : null;

  return (
    <div className="max-w-4xl space-y-6">
      <Breadcrumb items={[
        { label: '评估', href: '/projects' },
        { label: project.code, href: `/projects/${project.id}` },
        { label: L.risk.plural, href: `/projects/${project.id}/risks` },
        { label: `${risk.code} · ${risk.name}` },
      ]} />
      <div>
        <Link
          href={`/projects/${project.id}/risks`}
          className="text-[11px] text-slate-500 hover:text-slate-900"
        >
          ← 返回 {L.risk.plural}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="chip-blue">{project.assessmentType}</span>
          <span className="font-mono text-slate-400">{risk.code}</span>
          <span className="text-slate-300">·</span>
          <span className={`rounded-full px-2 py-0.5 font-medium ${gbtColor}`}>
            综合 {gbtLabel}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-400">
            影响 {risk.impactOverall ?? 0} × 可能 {risk.likelihoodOverall ?? 0} <span className="text-slate-300">(GB/T 39335)</span>
          </span>
          {v ? (
            <>
              <span className="text-slate-300">·</span>
              <span className={`rounded-full px-2 py-0.5 ${RISK_LEVEL_COLOR[lv]}`}>
                旧口径 {RISK_LEVEL_LABEL[lv]}({v})
              </span>
            </>
          ) : null}
        </div>
        <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight">{risk.name}</h1>
      </div>

      {/* Actor 标识 banner */}
      <section className="card-soft p-4">
        <div className="flex items-center justify-between">
          <div className="text-[12px]">
            <span className="text-slate-500">最后编辑：</span>
            {risk.lastEditActorType === 'AGENT' && editorAgent ? (
              <span>
                <span className="chip-blue">{editorAgent.displayName}</span>
                <span className="ml-2 text-slate-500">
                  ({editorAgent.owner?.name ?? 'unknown'} 的 Agent)
                </span>
              </span>
            ) : risk.lastEditActorType === 'HUMAN' && editorUser ? (
              <span className="chip">{editorUser.name ?? '人类'}</span>
            ) : (
              <span className="text-slate-400">—</span>
            )}
            {risk.lastEditAt && (
              <span className="ml-3 text-slate-400">
                {risk.lastEditAt.toLocaleString('zh-CN')}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500">
            {revisions.length} 条字段修订
          </div>
        </div>
      </section>

      {/* 1. 风险源 · 威胁事件 · 受影响主体 */}
      <section className="card-soft p-6">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[15px] font-semibold">风险叙事</h2>
          <span className="text-[11px] text-slate-400">GB/T 39335-2020 §5.4 / §5.5</span>
        </div>
        <div className="mt-4 grid gap-4">
          <NarrativeBlock title="风险源" body={risk.riskSource} hint="哪个环节 + 哪个字段 + 什么处理活动" />
          <NarrativeBlock title="威胁事件" body={risk.threatEvent} hint="具体可能发生什么(泄露 / 滥用 / 重识别 等)" />
          <NarrativeBlock title="受影响主体" body={risk.affectedSubjects} hint="范围 + 量级估算" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-[13px]">
            <Cell label="类别" value={risk.category} />
            <Cell label="处置策略" value={risk.strategy} />
            <Cell label="触及法条" value={risk.legalClauses || '—'} full />
            {risk.description && <Cell label="补充描述" value={risk.description} full />}
          </div>
        </div>
      </section>

      {/* 2. 个人权益影响 4 维 */}
      <section className="card-soft p-6">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[15px] font-semibold">个人权益影响</h2>
          <span className="text-[11px] text-slate-400">GB/T 39335 §5.5 · 4 维度</span>
          <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${GBT_SCORE_COLOR[risk.impactOverall ?? 0]}`}>
            综合 {GBT_SCORE_LABEL[risk.impactOverall ?? 0]} ({risk.impactOverall ?? 0})
          </span>
        </div>
        <table className="mt-4 w-full text-[12px]">
          <thead className="text-left text-[10px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-2 pr-3 font-medium">维度</th>
              <th className="py-2 pr-3 font-medium">评分</th>
              <th className="py-2 font-medium">评分理由</th>
            </tr>
          </thead>
          <tbody>
            {IMPACT_DIMENSIONS.map((d) => {
              const v = (risk as any)[d.key] as number | null | undefined;
              const reason = initialReasoning?.impactReasoning?.[d.key];
              return (
                <tr key={d.key} className="border-t border-slate-100 align-top">
                  <td className="py-2 pr-3 font-medium text-slate-700">{d.label}</td>
                  <td className="py-2 pr-3">
                    <span className={`inline-flex h-6 min-w-[40px] items-center justify-center rounded px-2 text-[11px] font-semibold tabular-nums ${GBT_SCORE_COLOR[v ?? 0]}`}>
                      {GBT_SCORE_LABEL[v ?? 0]} {v ?? 0}
                    </span>
                  </td>
                  <td className="py-2 text-slate-600">
                    {reason || <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* 3. 安全事件可能性 4 因素 */}
      <section className="card-soft p-6">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[15px] font-semibold">安全事件可能性</h2>
          <span className="text-[11px] text-slate-400">GB/T 39335 §5.4 · 4 因素</span>
          <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${GBT_SCORE_COLOR[risk.likelihoodOverall ?? 0]}`}>
            综合 {GBT_SCORE_LABEL[risk.likelihoodOverall ?? 0]} ({risk.likelihoodOverall ?? 0})
          </span>
        </div>
        <table className="mt-4 w-full text-[12px]">
          <thead className="text-left text-[10px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-2 pr-3 font-medium">因素</th>
              <th className="py-2 pr-3 font-medium">评分</th>
              <th className="py-2 font-medium">评分理由</th>
            </tr>
          </thead>
          <tbody>
            {LIKELIHOOD_FACTORS.map((f) => {
              const v = (risk as any)[f.key] as number | null | undefined;
              const reason = initialReasoning?.factorReasoning?.[f.key];
              return (
                <tr key={f.key} className="border-t border-slate-100 align-top">
                  <td className="py-2 pr-3 font-medium text-slate-700">{f.label}</td>
                  <td className="py-2 pr-3">
                    <span className={`inline-flex h-6 min-w-[40px] items-center justify-center rounded px-2 text-[11px] font-semibold tabular-nums ${GBT_SCORE_COLOR[v ?? 0]}`}>
                      {GBT_SCORE_LABEL[v ?? 0]} {v ?? 0}
                    </span>
                  </td>
                  <td className="py-2 text-slate-600">
                    {reason || <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* 4. 综合风险 = 影响 × 可能性(GB/T 39335 表 D.5) */}
      <section className="card-soft p-6">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[15px] font-semibold">综合风险等级</h2>
          <span className="text-[11px] text-slate-400">GB/T 39335 表 D.5 · 4 × 4 矩阵</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          权益影响 {risk.impactOverall ?? 0}({GBT_SCORE_LABEL[risk.impactOverall ?? 0]}) × 可能性 {risk.likelihoodOverall ?? 0}({GBT_SCORE_LABEL[risk.likelihoodOverall ?? 0]}) ⇒
          <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${gbtColor}`}>{gbtLabel}</span>
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="px-2 py-1 text-[10px] font-medium text-slate-400">影响 \\ 可能</th>
                {[1, 2, 3, 4].map((l) => (
                  <th key={l} className="px-2 py-1 text-[10px] font-medium text-slate-400">
                    {GBT_SCORE_LABEL[l]}({l})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[4, 3, 2, 1].map((i) => (
                <tr key={i}>
                  <td className="px-2 py-1 text-right text-[10px] font-medium text-slate-400">
                    {GBT_SCORE_LABEL[i]}({i})
                  </td>
                  {[1, 2, 3, 4].map((l) => {
                    const cellLabel = matrixCell(i, l);
                    const isCurrent = i === (risk.impactOverall ?? 0) && l === (risk.likelihoodOverall ?? 0);
                    return (
                      <td
                        key={l}
                        className={`px-3 py-2 text-center text-[11px] font-semibold ${matrixColor(cellLabel)} ${isCurrent ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                      >
                        {cellLabel}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 思考链 */}
      {initialReasoning && (
        <section className="card-soft border-l-2 border-l-blue-500 p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold">思考链</h2>
            <span className="chip-blue">Agent 起草时附带</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Agent 在写入这条数据时给出了它的思考过程。用于回看「为什么 Agent 这么判」+ 迭代 Agent。
          </p>
          <dl className="mt-4 space-y-3 text-[13px]">
            {initialReasoning.read && initialReasoning.read.length > 0 && (
              <ReasoningRow label="读了什么">
                <ul className="space-y-1">
                  {initialReasoning.read.map((r, i) => (
                    <li key={i} className="font-mono text-[11px] text-slate-600">
                      · {r}
                    </li>
                  ))}
                </ul>
              </ReasoningRow>
            )}
            {initialReasoning.considered && initialReasoning.considered.length > 0 && (
              <ReasoningRow label="考虑过的备选">
                <ul className="space-y-1">
                  {initialReasoning.considered.map((c, i) => (
                    <li key={i} className="text-slate-600">· {c}</li>
                  ))}
                </ul>
              </ReasoningRow>
            )}
            {initialReasoning.chose && (
              <ReasoningRow label="最终选择">
                <p className="rounded-lg bg-blue-50/60 px-3 py-2 text-slate-700">{initialReasoning.chose}</p>
              </ReasoningRow>
            )}
            {initialReasoning.why && (
              <ReasoningRow label="理由">
                <p className="text-slate-600">{initialReasoning.why}</p>
              </ReasoningRow>
            )}
          </dl>
        </section>
      )}

      {/* 引用源 · CitationLink */}
      <section className="card-soft p-6">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] font-semibold">引用源</h2>
          <span className="chip-blue">{citationLinks.length}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          这条风险背后的「证据」「论证文档」「相关讨论」「签字记录」。引用都绑了稳定标识(commit SHA / 消息 id)，原文失效后摘录留底。
        </p>
        {citationLinks.length === 0 && (
          <p className="mt-4 text-[12px] text-slate-400">还没有引用源。Agent 在 MCP create_risk 时可传 citations[] · 人在网页编辑时也可手动加。</p>
        )}
        <div className="mt-4 space-y-3">
          {citationLinks.map((cl) => {
            const { href, label } = sourceUriToHref(cl.source.type, cl.source.uri);
            const editor =
              cl.citedByActorType === 'AGENT' && cl.citedByAgentId
                ? `${citedAgentMap.get(cl.citedByAgentId)?.displayName ?? 'Agent'}`
                : cl.citedByActorType === 'HUMAN' && cl.citedByUserId
                  ? `${citedUserMap.get(cl.citedByUserId)?.name ?? '人类'}`
                  : '—';
            return (
              <article key={cl.id} className="rounded-xl border border-slate-100 bg-white/60 p-4">
                <header className="flex flex-wrap items-center gap-2">
                  <span className={CITATION_TYPE_COLOR[cl.citationType] ?? 'chip'}>{CITATION_TYPE_LABEL[cl.citationType] ?? cl.citationType}</span>
                  <span className="chip text-[10px]">{SOURCE_TYPE_LABEL[cl.source.type] ?? cl.source.type}</span>
                  <h3 className="text-[13px] font-semibold text-slate-900">
                    {cl.source.title || cl.source.uri}
                  </h3>
                  {href && href !== '#' && (
                    <a href={href} target="_blank" rel="noreferrer" className="ml-auto text-[11px] text-blue-600 hover:underline">
                      打开 {label} ↗
                    </a>
                  )}
                </header>
                {cl.excerpt && (
                  <p className="mt-2 rounded-lg bg-blue-50/40 p-3 text-[12px] leading-relaxed text-slate-700">
                    「{cl.excerpt}」
                  </p>
                )}
                {cl.source.excerpt && cl.source.excerpt !== cl.excerpt && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] text-slate-500">展开原文摘录(抓取时片段)</summary>
                    <p className="mt-1 rounded-lg bg-slate-50/60 p-3 text-[11px] leading-relaxed text-slate-500">
                      {cl.source.excerpt}
                    </p>
                  </details>
                )}
                <footer className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <span className="font-mono">{cl.source.uri}</span>
                  <span>·</span>
                  <span>{editor}</span>
                  <span>·</span>
                  <span>{cl.citedAt.toLocaleString('zh-CN')}</span>
                </footer>
              </article>
            );
          })}
        </div>
      </section>

      {/* 字段修订流水 */}
      <section className="card-soft p-6">
        <h2 className="text-[15px] font-semibold">字段修订历史</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          每一次字段变更都记一条。这是「迭代 Agent」的原始数据 —— 你可以看到 Agent 起草的什么 / 人改成了什么。
        </p>
        <div className="mt-4 space-y-3">
          {revisions.length === 0 && (
            <p className="text-[12px] text-slate-400">无修订记录</p>
          )}
          {revisions.map((rev) => {
            const actorChip =
              rev.actorType === 'AGENT' && rev.actorAgentId ? (
                <span className="chip-blue">
                  {agentMap.get(rev.actorAgentId)?.displayName ?? 'Agent'}
                </span>
              ) : rev.actorType === 'HUMAN' && rev.actorUserId ? (
                <span className="chip">{userMap.get(rev.actorUserId)?.name ?? '人类'}</span>
              ) : (
                <span className="chip">{rev.actorType}</span>
              );

            return (
              <div key={rev.id} className="rounded-xl bg-slate-50/60 p-3 text-[12px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {actorChip}
                    <span className="font-mono text-slate-500">{rev.fieldName}</span>
                    <span className="chip text-[10px]">{rev.source}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {rev.createdAt.toLocaleString('zh-CN')}
                  </span>
                </div>
                {(rev.oldValue || rev.newValue) && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-slate-400">原值</p>
                      <p className="mt-1 rounded bg-white p-2 text-slate-500">
                        {rev.oldValue || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">新值</p>
                      <p className="mt-1 rounded bg-blue-50/60 p-2 text-slate-700">
                        {rev.newValue || '—'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function safeParse(s: string | null): any {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function Cell({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-slate-700">{value}</dd>
    </div>
  );
}

function ReasoningRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-start gap-3">
      <dt className="text-[11px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function NarrativeBlock({ title, body, hint }: { title: string; body?: string | null; hint?: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-[12px] font-semibold text-slate-700">{title}</h3>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50/60 p-3 text-[12px] leading-relaxed text-slate-700">
        {body || <span className="text-slate-300">—</span>}
      </p>
    </div>
  );
}

/// GB/T 39335 表 D.5 静态矩阵 · 影响行 × 可能性列
const D5_MATRIX: Record<number, Record<number, string>> = {
  4: { 1: '中', 2: '高',   3: '严重', 4: '严重' },
  3: { 1: '中', 2: '中',   3: '高',   4: '严重' },
  2: { 1: '低', 2: '中',   3: '中',   4: '高'   },
  1: { 1: '低', 2: '低',   3: '中',   4: '中'   },
};
function matrixCell(impact: number, likelihood: number): string {
  return D5_MATRIX[impact]?.[likelihood] ?? '—';
}
function matrixColor(label: string): string {
  switch (label) {
    case '严重': return 'bg-red-600 text-white';
    case '高':   return 'bg-orange-400 text-orange-950';
    case '中':   return 'bg-amber-200 text-amber-900';
    case '低':   return 'bg-emerald-200 text-emerald-900';
    default:     return 'bg-slate-100 text-slate-500';
  }
}
