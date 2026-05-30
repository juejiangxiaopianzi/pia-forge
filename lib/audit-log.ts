/**
 * 审计留痕 · 统一入口
 * 所有写操作（创建/更新/删除/签字）都应通过本模块记一条 AuditLog。
 * PIPL §56 留痕至少 3 年的合规义务由本表承担。
 */

import { db } from '@/lib/db';
import type { AuditSource } from '@prisma/client';

export type AuditEntry = {
  projectId?: string | null;
  userId?: string | null;
  resource: string; // e.g. "Risk" / "Mitigation" / "Conclusion"
  resourceId: string;
  action: string;   // "create" | "update" | "delete" | "sign" | "revoke" 等
  source: AuditSource;
  agentName?: string | null;
  diff?: unknown;
};

export async function logAudit(entry: AuditEntry) {
  try {
    await db.auditLog.create({
      data: {
        projectId: entry.projectId ?? null,
        userId: entry.userId ?? null,
        resource: entry.resource,
        resourceId: entry.resourceId,
        action: entry.action,
        source: entry.source,
        agentName: entry.agentName ?? null,
        diff: entry.diff ? JSON.stringify(entry.diff) : null,
      },
    });
  } catch (e) {
    // 留痕失败不阻塞业务，但需要被监控发现
    console.error('[audit-log] failed', e);
  }
}
