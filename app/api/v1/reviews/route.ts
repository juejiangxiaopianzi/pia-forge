/**
 * GET  /api/v1/reviews?reviewer=me                   待我审阅的请求
 *      /api/v1/reviews?targetType=...&targetId=...   某对象上的审阅请求
 * POST /api/v1/reviews                                创建审阅请求
 *
 * Body(POST): { targetType, targetId, fieldName?, currentValue?, proposedValue?, rationale, reviewerUserId }
 */

import { db } from '@/lib/db';
import { verifyApiToken, requireScope } from '@/lib/api-auth';
import { ok, created, errUnauthorized, errBadRequest, errServer } from '@/lib/api-response';
import { logAudit } from '@/lib/audit-log';
import { resolveActor } from '@/lib/actor';
import { notifyReviewRequest } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'READ_PROJECTS'); } catch (e: any) { return errServer(e.message); }

  const url = new URL(req.url);
  const reviewer = url.searchParams.get('reviewer');
  const targetType = url.searchParams.get('targetType');
  const targetId = url.searchParams.get('targetId');
  const status = url.searchParams.get('status');

  const where: any = { organizationId: ctx.organizationId };
  if (reviewer === 'me') {
    where.reviewerUserId = ctx.userId;
  } else if (reviewer) {
    where.reviewerUserId = reviewer;
  }
  if (targetType && targetId) {
    where.targetType = targetType;
    where.targetId = targetId;
  }
  if (status) where.status = status;

  const items = await db.reviewRequest.findMany({
    where,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      requester: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true, email: true } },
    },
  });
  return ok(items);
}

export async function POST(req: Request) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'WRITE_PROJECTS'); } catch (e: any) { return errServer(e.message); }

  let body: any;
  try { body = await req.json(); } catch { return errBadRequest('请求体必须是合法 JSON'); }

  if (!body.targetType) return errBadRequest('targetType 必填');
  if (!body.targetId) return errBadRequest('targetId 必填');
  if (!body.reviewerUserId) return errBadRequest('reviewerUserId 必填');
  if (!body.rationale) return errBadRequest('rationale 必填(为什么要请审阅)');

  const actor = await resolveActor(ctx, req.headers);
  // 审阅请求的发起方必须是 human(走个人责任 · agent 用 actor.userId fallback)
  const requesterId = actor.type === 'HUMAN' ? actor.userId : ctx.userId;
  if (!requesterId) return errBadRequest('无法定位发起人 user');

  const r = await db.reviewRequest.create({
    data: {
      organizationId: ctx.organizationId,
      targetType: body.targetType,
      targetId: body.targetId,
      fieldName: body.fieldName ?? null,
      currentValue: body.currentValue ?? null,
      proposedValue: body.proposedValue ?? null,
      rationale: body.rationale,
      requesterUserId: requesterId,
      reviewerUserId: body.reviewerUserId,
    },
  });

  await logAudit({
    actor,
    resource: 'ReviewRequest',
    resourceId: r.id,
    action: 'create',
    source: actor.type === 'AGENT' ? 'REST_API' : 'WEB',
    diff: { created: r },
  });

  await notifyReviewRequest(r);

  return created(r);
}
