import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import Breadcrumb from '@/components/Breadcrumb';
import {
  IMPACT_DIMENSIONS, LIKELIHOOD_FACTORS, GBT_SCORE_COLOR, GBT_SCORE_LABEL,
  gbtLevelLabel, gbtLevelColor,
} from '@/lib/risk';
import { labelsFor } from '@/lib/module-labels';

export const dynamic = 'force-dynamic';

export default async function RisksPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();
  const L = labelsFor(project.assessmentType);

  const risks = await db.risk.findMany({
    where: { projectId: project.id },
    orderBy: [{ impactOverall: 'desc' }, { likelihoodOverall: 'desc' }, { likelihood: 'desc' }, { severity: 'desc' }],
    include: {
      dataItems: { select: { code: true, name: true } },
      scenarios: { select: { code: true, name: true } },
      mitigations: { select: { id: true, code: true, name: true, status: true } },
    },
  });

  // 反查最后编辑的 Agent 信息
  const agentIds = Array.from(new Set(risks.map((r) => r.lastEditAgentId).filter(Boolean))) as string[];
  const userIds = Array.from(new Set(risks.map((r) => r.lastEditUserId).filter(Boolean))) as string[];
  const agents = agentIds.length
    ? await db.agent.findMany({ where: { id: { in: agentIds } }, include: { owner: { select: { name: true } } } })
    : [];
  const users = userIds.length
    ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : [];
  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: '评估', href: '/projects' },
        { label: project.code, href: `/projects/${project.id}` },
        { label: '风险' },
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{project.code} · 05 {L.risk.plural}</p>
          <h1 className="mt-1 text-2xl font-semibold">{L.risk.plural}</h1>
        </div>
        <Link href={`/projects/${project.id}/risks/new`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + 新增{L.risk.singular}
        </Link>
      </div>

      <p className="text-[11px] text-slate-500">
        按 GB/T 39335-2020 国标:个人权益影响 4 维 × 安全事件可能性 4 因素;每个色块 0-4 档(无/低/中/高/严重)。
      </p>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-3">编号</th>
              <th className="px-3 py-3">名称 / 风险源</th>
              <th className="px-3 py-3">受影响主体</th>
              <th className="px-3 py-3">权益影响</th>
              <th className="px-3 py-3">可能性</th>
              <th className="px-3 py-3">综合等级</th>
              <th className="px-3 py-3">处置</th>
              <th className="px-3 py-3">编辑者</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r) => {
              const impactScores = [r.impactDecide, r.impactDiscriminate, r.impactReputation, r.impactProperty];
              const factorScores = [r.factorNetwork, r.factorProcess, r.factorPersonnel, r.factorBusiness];
              return (
                <tr key={r.id} className="border-t align-top hover:bg-blue-50/30">
                  <td className="px-3 py-3 font-mono text-[11px] tabular-nums">
                    <Link href={`/projects/${project.id}/risks/${r.id}`} className="text-blue-600 hover:underline">
                      {r.code}
                    </Link>
                  </td>
                  <td className="px-3 py-3 max-w-[280px]">
                    <Link href={`/projects/${project.id}/risks/${r.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {r.name}
                    </Link>
                    {r.riskSource && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                        <span className="text-slate-400">风险源:</span> {r.riskSource}
                      </p>
                    )}
                    {!r.riskSource && r.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{r.description}</p>
                    )}
                    {(r.dataItems.length > 0 || r.scenarios.length > 0) && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        关联：{[...r.dataItems.map((d) => d.code), ...r.scenarios.map((s) => s.code)].join(' · ')}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 max-w-[200px] text-[11px] text-slate-600">
                    {r.affectedSubjects || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <ScoreBlocks scores={impactScores} dims={IMPACT_DIMENSIONS} />
                    <p className="mt-1 text-[10px] text-slate-400 tabular-nums">综合 {r.impactOverall ?? 0}</p>
                  </td>
                  <td className="px-3 py-3">
                    <ScoreBlocks scores={factorScores} dims={LIKELIHOOD_FACTORS} />
                    <p className="mt-1 text-[10px] text-slate-400 tabular-nums">综合 {r.likelihoodOverall ?? 0}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${gbtLevelColor(r.impactOverall, r.likelihoodOverall)}`}>
                      {gbtLevelLabel(r.impactOverall, r.likelihoodOverall)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-slate-600">{r.strategy}</td>
                  <td className="px-3 py-3 text-[11px]">
                    {r.lastEditActorType === 'AGENT' && r.lastEditAgentId ? (
                      <span className="chip-blue">
                        {agentMap.get(r.lastEditAgentId)?.displayName ?? 'Agent'}
                      </span>
                    ) : r.lastEditActorType === 'HUMAN' && r.lastEditUserId ? (
                      <span className="chip">
                        {userMap.get(r.lastEditUserId)?.name ?? '人类'}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreBlocks({
  scores,
  dims,
}: {
  scores: Array<number | null | undefined>;
  dims: ReadonlyArray<{ key: string; label: string; short: string }>;
}) {
  return (
    <div className="flex items-center gap-1">
      {scores.map((s, i) => {
        const v = s ?? 0;
        return (
          <span
            key={dims[i].key}
            title={`${dims[i].label}: ${GBT_SCORE_LABEL[v]} (${v})`}
            className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold tabular-nums ${GBT_SCORE_COLOR[v]}`}
          >
            {v}
          </span>
        );
      })}
    </div>
  );
}
