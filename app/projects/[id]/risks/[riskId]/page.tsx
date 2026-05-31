import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { riskValue, riskLevelOf, RISK_LEVEL_LABEL, RISK_LEVEL_COLOR } from '@/lib/risk';
import { labelsFor } from '@/lib/module-labels';

export const dynamic = 'force-dynamic';

type ReasoningPayload = {
  read?: string[];
  considered?: string[];
  chose?: string;
  why?: string;
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

  // 把第一条 revision（创建时）的 reasoning 提取出来
  const initialRevision = revisions[revisions.length - 1]; // 最早一条
  const initialReasoning: ReasoningPayload | null = initialRevision?.reasoning
    ? safeParse(initialRevision.reasoning)
    : null;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link
          href={`/projects/${project.id}/risks`}
          className="text-[11px] text-slate-500 hover:text-slate-900"
        >
          ← 返回 {L.risk.plural}
        </Link>
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          <span className="chip-blue">{project.assessmentType}</span>
          <span className="font-mono text-slate-400">{risk.code}</span>
          <span className="text-slate-300">·</span>
          <span className={`rounded-full px-2 py-0.5 ${RISK_LEVEL_COLOR[lv]}`}>
            {RISK_LEVEL_LABEL[lv]} {v ? `(${v})` : ''}
          </span>
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
                <span className="chip-blue">🤖 {editorAgent.displayName}</span>
                <span className="ml-2 text-slate-500">
                  ({editorAgent.owner?.name ?? 'unknown'} 的 Agent)
                </span>
              </span>
            ) : risk.lastEditActorType === 'HUMAN' && editorUser ? (
              <span className="chip">👤 {editorUser.name ?? '人类'}</span>
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

      {/* 字段卡片 */}
      <section className="card-soft p-6">
        <h2 className="text-[15px] font-semibold">基本信息</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
          <Cell label="类别" value={risk.category} />
          <Cell label="处置策略" value={risk.strategy} />
          <Cell label="可能性" value={`${risk.likelihood}`} />
          <Cell label="严重程度" value={`${risk.severity}`} />
          <Cell label="触及法条" value={risk.legalClauses || '—'} full />
          <Cell label="描述" value={risk.description || '—'} full />
        </dl>
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
                  🤖 {agentMap.get(rev.actorAgentId)?.displayName ?? 'Agent'}
                </span>
              ) : rev.actorType === 'HUMAN' && rev.actorUserId ? (
                <span className="chip">👤 {userMap.get(rev.actorUserId)?.name ?? '人类'}</span>
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
