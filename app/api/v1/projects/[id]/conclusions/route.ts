import { db } from '@/lib/db';
import { verifyApiToken, requireScope } from '@/lib/api-auth';
import { ok, created, errUnauthorized, errBadRequest, errNotFound, errServer } from '@/lib/api-response';
import { logAudit } from '@/lib/audit-log';
import { resolveActor } from '@/lib/actor';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'READ_CONCLUSIONS'); } catch (e: any) { return errServer(e.message); }

  const project = await db.piaProject.findFirst({ where: { id: params.id, organizationId: ctx.organizationId } });
  if (!project) return errNotFound('评估项目');

  const conclusions = await db.conclusion.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'desc' },
  });
  return ok(conclusions);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'WRITE_CONCLUSIONS'); } catch (e: any) { return errServer(e.message); }

  let body: any;
  try { body = await req.json(); } catch { return errBadRequest('请求体必须是合法 JSON'); }

  const project = await db.piaProject.findFirst({ where: { id: params.id, organizationId: ctx.organizationId } });
  if (!project) return errNotFound('评估项目');

  if (!body.title) return errBadRequest('title 必填');

  const c = await db.conclusion.create({
    data: {
      projectId: project.id,
      title: body.title,
      evaluationTarget: body.evaluationTarget ?? project.title,
      overallVerdict: body.overallVerdict ?? '',
      residualLevel: body.residualLevel ?? 'UNRATED',
      highRiskSummary: body.highRiskSummary ?? '',
      businessAdvice: body.businessAdvice ?? '',
      regulatorTone: body.regulatorTone ?? '',
      signerId: body.signerId ?? ctx.userId,
      signerRoleLabel: body.signerRoleLabel ?? null,
      nextReviewAt: body.nextReviewAt ? new Date(body.nextReviewAt) : null,
      reviewTriggers: body.reviewTriggers ?? project.reviewTriggers,
      reviewerId: body.reviewerId ?? null,
      state: body.state ?? 'DRAFT',
    },
  });

  const actor = await resolveActor(ctx, req.headers);
  await logAudit({
    projectId: project.id,
    actor,
    resource: 'Conclusion',
    resourceId: c.id,
    action: 'create',
    source: actor.type === 'AGENT' ? 'REST_API' : 'WEB',
    diff: { created: c },
  });

  return created(c);
}
