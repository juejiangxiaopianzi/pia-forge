/**
 * 审计留痕 · 统一入口
 * PIPL §56 留痕 ≥3 年的合规义务由本表承担。
 * 与 FieldRevision 互补：AuditLog 记 record 级动作(create/update/delete/sign)，
 * FieldRevision 记字段级 diff（细到「这个字段 Agent 草拟了 X 人改成了 Y」）
 */

import { db } from '@/lib/db';
import type { AuditSource } from '@prisma/client';
import type { Actor } from '@/lib/actor';

export type AuditEntry = {
  projectId?: string | null;
  actor: Actor;
  resource: string;
  resourceId: string;
  action: string;
  source: AuditSource;
  diff?: unknown;
};

export async function logAudit(entry: AuditEntry) {
  try {
    await db.auditLog.create({
      data: {
        projectId: entry.projectId ?? null,
        resource: entry.resource,
        resourceId: entry.resourceId,
        action: entry.action,
        source: entry.source,
        actorType: entry.actor.type,
        userId: entry.actor.type === 'HUMAN' ? entry.actor.userId : null,
        actorAgentId: entry.actor.type === 'AGENT' ? entry.actor.agentId : null,
        actorAgentSnapshotId: entry.actor.agentSnapshotId,
        diff: entry.diff ? JSON.stringify(entry.diff) : null,
      },
    });
  } catch (e) {
    console.error('[audit-log] failed', e);
  }
}
