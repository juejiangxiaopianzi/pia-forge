import { db } from '@/lib/db';
import { verifyApiToken, requireScope } from '@/lib/api-auth';
import { ok, created, errUnauthorized, errBadRequest, errNotFound, errServer } from '@/lib/api-response';
import { logAudit } from '@/lib/audit-log';
import { riskValue, riskLevelOf } from '@/lib/risk';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'READ_MITIGATIONS'); } catch (e: any) { return errServer(e.message); }

  const project = await db.piaProject.findFirst({ where: { id: params.id, organizationId: ctx.organizationId } });
  if (!project) return errNotFound('评估项目');

  const mitigations = await db.mitigation.findMany({
    where: { projectId: project.id },
    orderBy: { dueAt: 'asc' },
    include: { risk: { select: { id: true, code: true, name: true } } },
  });

  const enriched = mitigations.map((m) => {
    const value = riskValue(m.residualLikelihood, m.residualSeverity);
    return { ...m, residualValue: value, residualLevel: riskLevelOf(value) };
  });
  return ok(enriched);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'WRITE_MITIGATIONS'); } catch (e: any) { return errServer(e.message); }

  let body: any;
  try { body = await req.json(); } catch { return errBadRequest('请求体必须是合法 JSON'); }

  const project = await db.piaProject.findFirst({ where: { id: params.id, organizationId: ctx.organizationId } });
  if (!project) return errNotFound('评估项目');

  if (!body.riskId) return errBadRequest('riskId 必填');
  if (!body.name) return errBadRequest('name 必填');
  if (!body.controlType) return errBadRequest('controlType 必填 (TECHNICAL/PROCESS/LEGAL/PRODUCT_UX/TRAINING/AUDIT)');

  const count = await db.mitigation.count({ where: { projectId: project.id } });
  const code = body.code ?? `C-${String(count + 1).padStart(3, '0')}`;

  const m = await db.mitigation.create({
    data: {
      projectId: project.id,
      riskId: body.riskId,
      code,
      name: body.name,
      controlType: body.controlType,
      details: body.details ?? '',
      ownerId: body.ownerId ?? ctx.userId,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      status: body.status ?? 'NOT_STARTED',
      residualLikelihood: body.residualLikelihood ?? null,
      residualSeverity: body.residualSeverity ?? null,
      acceptable: body.acceptable ?? 'NOT_EVALUATED',
      acceptReason: body.acceptReason ?? null,
      notes: body.notes ?? null,
    },
  });

  await logAudit({
    projectId: project.id,
    userId: ctx.userId,
    resource: 'Mitigation',
    resourceId: m.id,
    action: 'create',
    source: 'REST_API',
    agentName: req.headers.get('x-agent-name'),
    diff: { created: m },
  });

  return created(m);
}
