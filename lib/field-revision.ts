/**
 * FieldRevision · 字段级修订写入
 *
 * 谁调谁记 · 这是迭代 Agent 的原始数据来源
 */

import { db } from '@/lib/db';
import type { Actor } from '@/lib/actor';
import type { AuditSource } from '@prisma/client';

export type ReasoningPayload = {
  read?: string[];        // Agent 读了哪些资源（法规 / 历史 case / Skill）
  considered?: string[];  // 考虑过哪些备选
  chose?: string;         // 最终选择
  why?: string;           // 理由
  [k: string]: unknown;
};

export type RevisionInput = {
  projectId?: string | null;
  resource: string;       // "Risk" | "DataItem" | ...
  resourceId: string;
  changes: Array<{
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
  }>;
  actor: Actor;
  source: AuditSource;
  reasoning?: ReasoningPayload | null;
};

export async function writeFieldRevisions(input: RevisionInput) {
  if (input.changes.length === 0) return;
  await db.fieldRevision.createMany({
    data: input.changes.map((c) => ({
      projectId: input.projectId ?? null,
      resource: input.resource,
      resourceId: input.resourceId,
      fieldName: c.field,
      oldValue: c.oldValue == null ? null : safeStringify(c.oldValue),
      newValue: c.newValue == null ? null : safeStringify(c.newValue),
      reasoning: input.reasoning ? JSON.stringify(input.reasoning) : null,
      actorType: input.actor.type,
      actorUserId: input.actor.type === 'HUMAN' ? input.actor.userId : null,
      actorAgentId: input.actor.type === 'AGENT' ? input.actor.agentId : null,
      actorAgentSnapshotId: input.actor.agentSnapshotId,
      source: input.source,
    })),
  });
}

function safeStringify(v: unknown): string {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
