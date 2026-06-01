/**
 * GET  /api/v1/comments?targetType=Risk&targetId=xxx   列出对象评论
 * POST /api/v1/comments                                 创建评论
 *
 * Body(POST): { targetType, targetId, body, mentions?, replyToId?, organizationId? }
 * 鉴权: Bearer Token · READ_PROJECTS / WRITE_PROJECTS
 */

import { db } from '@/lib/db';
import { verifyApiToken, requireScope } from '@/lib/api-auth';
import { ok, created, errUnauthorized, errBadRequest, errServer } from '@/lib/api-response';
import { logAudit } from '@/lib/audit-log';
import { resolveActor } from '@/lib/actor';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'READ_PROJECTS'); } catch (e: any) { return errServer(e.message); }

  const url = new URL(req.url);
  const targetType = url.searchParams.get('targetType');
  const targetId = url.searchParams.get('targetId');
  if (!targetType || !targetId) return errBadRequest('targetType 和 targetId 必填');

  const comments = await db.comment.findMany({
    where: { organizationId: ctx.organizationId, targetType, targetId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, name: true, email: true } },
      authorAgent: { select: { id: true, displayName: true } },
    },
  });
  return ok(comments);
}

export async function POST(req: Request) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'WRITE_PROJECTS'); } catch (e: any) { return errServer(e.message); }

  let body: any;
  try { body = await req.json(); } catch { return errBadRequest('请求体必须是合法 JSON'); }

  if (!body.targetType) return errBadRequest('targetType 必填');
  if (!body.targetId) return errBadRequest('targetId 必填');
  if (!body.body || typeof body.body !== 'string') return errBadRequest('body 必填');

  const actor = await resolveActor(ctx, req.headers);
  const comment = await db.comment.create({
    data: {
      organizationId: ctx.organizationId,
      targetType: body.targetType,
      targetId: body.targetId,
      authorUserId: actor.type === 'HUMAN' ? actor.userId : null,
      authorAgentId: actor.type === 'AGENT' ? actor.agentId : null,
      body: body.body,
      mentions: Array.isArray(body.mentions) ? body.mentions : [],
      replyToId: body.replyToId ?? null,
    },
  });

  await logAudit({
    actor,
    resource: 'Comment',
    resourceId: comment.id,
    action: 'create',
    source: actor.type === 'AGENT' ? 'REST_API' : 'WEB',
    diff: { created: comment },
  });

  return created(comment);
}
