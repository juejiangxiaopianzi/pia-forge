/**
 * PATCH /api/v1/assignments/[id]   更新任务状态
 *
 * Body: { status, completionNote? }
 */

import { db } from '@/lib/db';
import { verifyApiToken, requireScope } from '@/lib/api-auth';
import { ok, errUnauthorized, errBadRequest, errNotFound, errServer } from '@/lib/api-response';
import { logAudit } from '@/lib/audit-log';
import { resolveActor } from '@/lib/actor';
import type { AssignmentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: AssignmentStatus[] = ['TODO', 'IN_PROGRESS', 'AWAITING_REVIEW', 'DONE', 'CANCELLED'];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'WRITE_PROJECTS'); } catch (e: any) { return errServer(e.message); }

  let body: any;
  try { body = await req.json(); } catch { return errBadRequest('请求体必须是合法 JSON'); }

  const existing = await db.assignment.findFirst({
    where: { id: params.id, organizationId: ctx.organizationId },
  });
  if (!existing) return errNotFound('Assignment');

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return errBadRequest(`status 必须是 ${VALID_STATUSES.join(' / ')}`);
  }

  const actor = await resolveActor(ctx, req.headers);

  const updated = await db.assignment.update({
    where: { id: existing.id },
    data: {
      status: body.status ?? existing.status,
      completionNote: body.completionNote ?? existing.completionNote,
      completedAt: body.status === 'DONE' ? new Date() : existing.completedAt,
    },
  });

  await logAudit({
    actor,
    resource: 'Assignment',
    resourceId: updated.id,
    action: 'update',
    source: actor.type === 'AGENT' ? 'REST_API' : 'WEB',
    diff: { before: { status: existing.status }, after: { status: updated.status, completionNote: updated.completionNote } },
  });

  return ok(updated);
}
