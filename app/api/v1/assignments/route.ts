/**
 * GET  /api/v1/assignments?assignee=me              列出当前 user 的任务
 *      /api/v1/assignments?targetType=...&targetId  列出某对象上的任务
 * POST /api/v1/assignments                          创建任务分派
 *
 * Body(POST): { targetType, targetId, assigneeUserId, note?, dueAt? }
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
  const assignee = url.searchParams.get('assignee');
  const targetType = url.searchParams.get('targetType');
  const targetId = url.searchParams.get('targetId');
  const status = url.searchParams.get('status');

  const where: any = { organizationId: ctx.organizationId };
  if (assignee === 'me') {
    where.assigneeUserId = ctx.userId;
  } else if (assignee) {
    where.assigneeUserId = assignee;
  }
  if (targetType && targetId) {
    where.targetType = targetType;
    where.targetId = targetId;
  }
  if (status) where.status = status;

  const items = await db.assignment.findMany({
    where,
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      assigner: { select: { id: true, name: true, email: true } },
      assignerAgent: { select: { id: true, displayName: true } },
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
  if (!body.assigneeUserId) return errBadRequest('assigneeUserId 必填');

  const actor = await resolveActor(ctx, req.headers);

  const a = await db.assignment.create({
    data: {
      organizationId: ctx.organizationId,
      targetType: body.targetType,
      targetId: body.targetId,
      assigneeUserId: body.assigneeUserId,
      assignerUserId: actor.type === 'HUMAN' ? actor.userId : null,
      assignerAgentId: actor.type === 'AGENT' ? actor.agentId : null,
      note: body.note ?? null,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
    },
  });

  await logAudit({
    actor,
    resource: 'Assignment',
    resourceId: a.id,
    action: 'create',
    source: actor.type === 'AGENT' ? 'REST_API' : 'WEB',
    diff: { created: a },
  });

  return created(a);
}
