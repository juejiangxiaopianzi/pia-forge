import { db } from '@/lib/db';
import { verifyApiToken, requireScope } from '@/lib/api-auth';
import { ok, errUnauthorized, errNotFound, errBadRequest, errServer } from '@/lib/api-response';
import { logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'READ_PROJECTS'); } catch (e: any) { return errServer(e.message); }

  const project = await db.piaProject.findFirst({
    where: { id: params.id, organizationId: ctx.organizationId },
    include: {
      _count: { select: { risks: true, mitigations: true, dataItems: true, scenarios: true, roles: true } },
    },
  });
  if (!project) return errNotFound('评估项目');
  return ok(project);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'WRITE_PROJECTS'); } catch (e: any) { return errServer(e.message); }

  let body: any;
  try { body = await req.json(); } catch { return errBadRequest('请求体必须是合法 JSON'); }

  const existing = await db.piaProject.findFirst({
    where: { id: params.id, organizationId: ctx.organizationId },
  });
  if (!existing) return errNotFound('评估项目');

  const updated = await db.piaProject.update({
    where: { id: params.id },
    data: {
      title: body.title ?? undefined,
      scope: body.scope ?? undefined,
      purpose: body.purpose ?? undefined,
      legalBases: body.legalBases ?? undefined,
      targetDoneAt: body.targetDoneAt !== undefined ? (body.targetDoneAt ? new Date(body.targetDoneAt) : null) : undefined,
      overallVerdict: body.overallVerdict ?? undefined,
      residualLevel: body.residualLevel ?? undefined,
      reviewTriggers: body.reviewTriggers ?? undefined,
      approvalState: body.approvalState ?? undefined,
      version: body.version ?? undefined,
      notes: body.notes ?? undefined,
    },
  });

  await logAudit({
    projectId: updated.id,
    userId: ctx.userId,
    resource: 'PiaProject',
    resourceId: updated.id,
    action: 'update',
    source: 'REST_API',
    agentName: req.headers.get('x-agent-name'),
    diff: { before: existing, after: updated },
  });

  return ok(updated);
}
