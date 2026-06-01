/**
 * PATCH /api/v1/reviews/[id]   审阅人决策
 *
 * Body: { status ∈ APPROVED / CHANGES_REQUESTED / REJECTED, decisionNote? }
 */

import { db } from '@/lib/db';
import { verifyApiToken, requireScope } from '@/lib/api-auth';
import { ok, errUnauthorized, errBadRequest, errNotFound, errServer } from '@/lib/api-response';
import { logAudit } from '@/lib/audit-log';
import { resolveActor } from '@/lib/actor';
import type { ReviewStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const DECISION_STATUSES: ReviewStatus[] = ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'WRITE_PROJECTS'); } catch (e: any) { return errServer(e.message); }

  let body: any;
  try { body = await req.json(); } catch { return errBadRequest('请求体必须是合法 JSON'); }

  if (!body.status || !DECISION_STATUSES.includes(body.status)) {
    return errBadRequest(`status 必须是 ${DECISION_STATUSES.join(' / ')}`);
  }

  const existing = await db.reviewRequest.findFirst({
    where: { id: params.id, organizationId: ctx.organizationId },
  });
  if (!existing) return errNotFound('ReviewRequest');

  const actor = await resolveActor(ctx, req.headers);

  const updated = await db.reviewRequest.update({
    where: { id: existing.id },
    data: {
      status: body.status,
      decisionNote: body.decisionNote ?? null,
      decidedAt: new Date(),
    },
  });

  await logAudit({
    actor,
    resource: 'ReviewRequest',
    resourceId: updated.id,
    action: 'decide',
    source: actor.type === 'AGENT' ? 'REST_API' : 'WEB',
    diff: { before: { status: existing.status }, after: { status: updated.status, decisionNote: updated.decisionNote } },
  });

  return ok(updated);
}
