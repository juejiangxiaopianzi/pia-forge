import { db } from '@/lib/db';
import { verifyApiToken, requireScope } from '@/lib/api-auth';
import { ok, created, errUnauthorized, errBadRequest, errNotFound, errServer } from '@/lib/api-response';
import { logAudit } from '@/lib/audit-log';
import { resolveActor } from '@/lib/actor';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'READ_PROJECTS'); } catch (e: any) { return errServer(e.message); }

  const project = await db.piaProject.findFirst({ where: { id: params.id, organizationId: ctx.organizationId } });
  if (!project) return errNotFound('评估项目');

  const list = await db.scenario.findMany({
    where: { projectId: project.id },
    orderBy: { code: 'asc' },
  });
  // 把 BigInt 转 string，否则 JSON.stringify 会爆
  const safe = list.map((s) => ({ ...s, annualVolume: s.annualVolume?.toString() ?? null }));
  return ok(safe);
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
  if (!body.receiverType) return errBadRequest('receiverType 必填');

  const count = await db.scenario.count({ where: { projectId: project.id } });
  const code = body.code ?? `SC-${String(count + 1).padStart(3, '0')}`;

  const sc = await db.scenario.create({
    data: {
      projectId: project.id,
      code,
      name: body.name,
      description: body.description ?? '',
      receiverType: body.receiverType,
      receiverRegions: body.receiverRegions ?? '',
      techPath: body.techPath ?? '',
      encryption: body.encryption ?? '',
      annualVolume: body.annualVolume ? BigInt(body.annualVolume) : null,
      shareRatio: body.shareRatio ?? null,
      triggerRules: body.triggerRules ?? '',
      safeguards: body.safeguards ?? '',
      scenarioRisk: body.scenarioRisk ?? '',
      legalBases: body.legalBases ?? [],
      ownerId: body.ownerId ?? ctx.userId,
      status: body.status ?? 'PENDING',
    },
  });

  const actor = await resolveActor(ctx, req.headers);
  await logAudit({
    projectId: project.id,
    actor,
    resource: 'Scenario',
    resourceId: sc.id,
    action: 'create',
    source: actor.type === 'AGENT' ? 'REST_API' : 'WEB',
    diff: { created: { ...sc, annualVolume: sc.annualVolume?.toString() } },
  });

  return created({ ...sc, annualVolume: sc.annualVolume?.toString() ?? null });
}
