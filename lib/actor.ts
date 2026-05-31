/**
 * Actor 解析 · 给所有写入端点用
 *
 * 规则:
 * - 如果 AuthContext 带 agentId → actor = AGENT (并连带 snapshot)
 * - 否则 actor = HUMAN (userId)
 * - Agent 可以通过请求头 x-agent-snapshot 指定当时使用的版本
 */

import { db } from '@/lib/db';
import type { AuthContext } from '@/lib/api-auth';

export type Actor = {
  type: 'HUMAN' | 'AGENT';
  userId: string | null;
  agentId: string | null;
  agentSnapshotId: string | null;
};

export async function resolveActor(
  ctx: AuthContext,
  headers: Headers
): Promise<Actor> {
  if (!ctx.agentId) {
    return { type: 'HUMAN', userId: ctx.userId, agentId: null, agentSnapshotId: null };
  }
  // Agent 接入 · 解析 snapshot
  const snapshotVersion = headers.get('x-agent-snapshot');
  let snapshotId: string | null = null;
  if (snapshotVersion) {
    const snap = await db.agentSnapshot.findUnique({
      where: { agentId_version: { agentId: ctx.agentId, version: snapshotVersion } },
    });
    snapshotId = snap?.id ?? null;
  } else {
    // fallback: 取最新一条 snapshot
    const latest = await db.agentSnapshot.findFirst({
      where: { agentId: ctx.agentId },
      orderBy: { capturedAt: 'desc' },
    });
    snapshotId = latest?.id ?? null;
  }
  return {
    type: 'AGENT',
    userId: ctx.userId,    // Agent 背后的人 · 用于 fallback / 责任主体
    agentId: ctx.agentId,
    agentSnapshotId: snapshotId,
  };
}

/// 把 actor 拆成 Prisma 字段（用于 lastEdit*）
export function actorToLastEditFields(actor: Actor) {
  return {
    lastEditActorType: actor.type,
    lastEditUserId: actor.type === 'HUMAN' ? actor.userId : null,
    lastEditAgentId: actor.type === 'AGENT' ? actor.agentId : null,
    lastEditAt: new Date(),
  };
}
