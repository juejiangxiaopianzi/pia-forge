import Link from 'next/link';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function createAgent(formData: FormData) {
  'use server';
  const displayName = String(formData.get('displayName') || '').trim();
  const description = String(formData.get('description') || '').trim() || null;
  if (!displayName) return;

  const org = await db.organization.findFirst();
  const user = await db.user.findFirst();
  if (!org || !user) return;

  await db.agent.create({
    data: {
      organizationId: org.id,
      ownerId: user.id,
      displayName,
      description,
      status: 'ACTIVE',
      snapshots: { create: { version: 'v1.0', changeNotes: '首版（自动登记）' } },
    },
  });
  revalidatePath('/settings/agents');
}

async function retireAgent(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  await db.agent.update({
    where: { id },
    data: { status: 'RETIRED', retiredAt: new Date() },
  });
  revalidatePath('/settings/agents');
}

export default async function AgentsPage() {
  const org = await db.organization.findFirst();
  const agents = org
    ? await db.agent.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          snapshots: { orderBy: { capturedAt: 'desc' }, take: 1 },
          _count: { select: { snapshots: true, apiTokens: true } },
        },
      })
    : [];

  // 每个 Agent 的近期写入量（FieldRevision count）+ 改稿率粗略统计
  const stats = await Promise.all(
    agents.map(async (a) => {
      const writes = await db.fieldRevision.count({ where: { actorAgentId: a.id } });
      const auditCount = await db.auditLog.count({ where: { actorAgentId: a.id } });
      return { agentId: a.id, writes, auditCount };
    })
  );
  const statsMap = new Map(stats.map((s) => [s.agentId, s]));

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">设置 · Agents</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">Agents</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-500">
          每个 Agent 是一个有身份的 actor,绑定到一个人,代表「这个人的 Agent」。
          数据流入系统时会带上 Agent 身份,便于回溯、评价、迭代。
        </p>
      </div>

      <section className="card-soft p-6">
        <h2 className="text-base font-semibold">为我的 Agent 颁个身份</h2>
        <form action={createAgent} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="block font-medium">Agent 名称</span>
            <input
              name="displayName"
              required
              placeholder="如：我的 Claude Code · PIA 风险起草助手"
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="block font-medium">说明（可选）</span>
            <textarea
              name="description"
              rows={2}
              placeholder="用途、模型、装了哪些 skill"
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            />
          </label>
          <button type="submit" className="btn-primary">颁发身份</button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">现有 Agents（{agents.length}）</h2>
        <div className="space-y-3">
          {agents.length === 0 && (
            <div className="card-soft p-12 text-center text-sm text-slate-500">
              还没有 Agent。
            </div>
          )}
          {agents.map((a) => {
            const latest = a.snapshots[0];
            const s = statsMap.get(a.id);
            return (
              <article key={a.id} className="card-soft card-hover p-5">
                <header className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-semibold text-slate-900">{a.displayName}</h3>
                      {a.status === 'RETIRED' ? (
                        <span className="chip">已弃用</span>
                      ) : (
                        <span className="chip-green">激活</span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-slate-400">
                      {a.id.startsWith('agt_') ? a.id : `agt · ${a.id.slice(-12)}`}
                    </p>
                    {a.description && (
                      <p className="mt-2 text-[12px] leading-relaxed text-slate-600">{a.description}</p>
                    )}
                  </div>
                  {a.status === 'ACTIVE' && (
                    <form action={retireAgent}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-xs text-rose-600 hover:underline" type="submit">弃用</button>
                    </form>
                  )}
                </header>

                <dl className="mt-4 grid grid-cols-4 gap-3 text-center">
                  <Stat label="Owner" value={a.owner?.name ?? '—'} />
                  <Stat label="当前版本" value={latest?.version ?? '—'} />
                  <Stat label="写入次数" value={String(s?.writes ?? 0)} />
                  <Stat label="审计动作" value={String(s?.auditCount ?? 0)} />
                </dl>

                {latest && (
                  <p className="mt-3 text-[11px] text-slate-500">
                    最近一次变更:{latest.capturedAt.toLocaleDateString('zh-CN')} · {latest.changeNotes ?? '无说明'}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="card-soft p-5 bg-blue-50/30">
        <h3 className="text-sm font-semibold">怎么把 Agent 接到 PIA Forge</h3>
        <ol className="mt-3 space-y-1.5 text-[13px] text-slate-600">
          <li>1. 在上面颁发一个 Agent 身份(每个 Agent 是「某个人的」)</li>
          <li>2. 去 <Link href="/settings/tokens" className="text-blue-600 hover:underline">API Tokens</Link> 创建 token 时,把它绑定到这个 Agent</li>
          <li>3. 你的 Claude Code / Cursor 用这个 token 通过 MCP 接入</li>
          <li>4. Agent 写入任何数据时,系统自动标记 actor=AGENT · agentId · snapshotId</li>
          <li>5. 在风险/信息项详情页能看到「由 Agent (黄越的) 起草」+ 思考链</li>
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2">
      <div className="truncate text-[13px] font-semibold text-slate-900">{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}
