import { db } from '@/lib/db';
import { verifyApiToken, requireScope } from '@/lib/api-auth';
import { ok, created, errUnauthorized, errBadRequest, errNotFound, errServer } from '@/lib/api-response';
import { logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'READ_PROJECTS'); } catch (e: any) { return errServer(e.message); }

  const project = await db.piaProject.findFirst({ where: { id: params.id, organizationId: ctx.organizationId } });
  if (!project) return errNotFound('评估项目');

  const items = await db.dataItem.findMany({
    where: { projectId: project.id },
    orderBy: { code: 'asc' },
    include: { scenarios: { select: { id: true, code: true } } },
  });
  return ok(items);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'WRITE_PROJECTS'); } catch (e: any) { return errServer(e.message); }

  let body: any;
  try { body = await req.json(); } catch { return errBadRequest('请求体必须是合法 JSON'); }

  const project = await db.piaProject.findFirst({ where: { id: params.id, organizationId: ctx.organizationId } });
  if (!project) return errNotFound('评估项目');

  if (!body.name) return errBadRequest('name 必填');

  const count = await db.dataItem.count({ where: { projectId: project.id } });
  const code = body.code ?? `DI-${String(count + 1).padStart(3, '0')}`;

  const item = await db.dataItem.create({
    data: {
      projectId: project.id,
      code,
      name: body.name,
      techName: body.techName ?? null,
      classification: body.classification ?? 'GENERAL',
      sensitiveSub: body.sensitiveSub ?? [],
      legalBasis: body.legalBasis ?? null,
      legalReasoning: body.legalReasoning ?? '',
      isOutbound: body.isOutbound ?? false,
      stages: body.stages ?? [],
      necessity: body.necessity ?? '',
      status: body.status ?? 'PENDING',
      ownerId: body.ownerId ?? ctx.userId,
      notes: body.notes ?? null,
      scenarios: body.scenarioIds ? { connect: body.scenarioIds.map((id: string) => ({ id })) } : undefined,
    },
  });

  await logAudit({
    projectId: project.id,
    userId: ctx.userId,
    resource: 'DataItem',
    resourceId: item.id,
    action: 'create',
    source: 'REST_API',
    agentName: req.headers.get('x-agent-name'),
    diff: { created: item },
  });

  return created(item);
}
