import { db } from '@/lib/db';
import { verifyApiToken, requireScope } from '@/lib/api-auth';
import { ok, created, errUnauthorized, errBadRequest, errNotFound, errServer } from '@/lib/api-response';
import { logAudit } from '@/lib/audit-log';
import { riskValue, riskLevelOf } from '@/lib/risk';
import { resolveActor, actorToLastEditFields } from '@/lib/actor';
import { writeFieldRevisions, type ReasoningPayload } from '@/lib/field-revision';
import { writeCitations, type CitationInput } from '@/lib/citations';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'READ_RISKS'); } catch (e: any) { return errServer(e.message); }

  const project = await db.piaProject.findFirst({ where: { id: params.id, organizationId: ctx.organizationId } });
  if (!project) return errNotFound('评估项目');

  const risks = await db.risk.findMany({
    where: { projectId: project.id },
    orderBy: [{ likelihood: 'desc' }, { severity: 'desc' }],
    include: {
      dataItems: { select: { id: true, code: true, name: true } },
      scenarios: { select: { id: true, code: true, name: true } },
      mitigations: { select: { id: true, code: true, name: true, status: true } },
    },
  });

  const enriched = risks.map((r) => {
    const value = riskValue(r.likelihood, r.severity);
    return { ...r, riskValue: value, riskLevel: riskLevelOf(value) };
  });
  return ok(enriched);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try { requireScope(ctx, 'WRITE_RISKS'); } catch (e: any) { return errServer(e.message); }

  let body: any;
  try { body = await req.json(); } catch { return errBadRequest('请求体必须是合法 JSON'); }

  const project = await db.piaProject.findFirst({ where: { id: params.id, organizationId: ctx.organizationId } });
  if (!project) return errNotFound('评估项目');

  if (!body.name) return errBadRequest('name 必填');
  if (typeof body.likelihood !== 'number' || body.likelihood < 1 || body.likelihood > 5)
    return errBadRequest('likelihood 必须是 1-5 整数');
  if (typeof body.severity !== 'number' || body.severity < 1 || body.severity > 5)
    return errBadRequest('severity 必须是 1-5 整数');
  if (!body.category) return errBadRequest('category 必填');
  if (!body.strategy) return errBadRequest('strategy 必填 (MITIGATE / TRANSFER / ACCEPT / AVOID)');

  const actor = await resolveActor(ctx, req.headers);
  const reasoning: ReasoningPayload | undefined = body.reasoning;

  const count = await db.risk.count({ where: { projectId: project.id } });
  const code = body.code ?? `R-${String(count + 1).padStart(3, '0')}`;

  const risk = await db.risk.create({
    data: {
      projectId: project.id,
      code,
      name: body.name,
      category: body.category,
      description: body.description ?? '',
      likelihood: body.likelihood,
      severity: body.severity,
      legalClauses: body.legalClauses ?? '',
      filerId: body.filerId ?? ctx.userId,
      strategy: body.strategy,
      notes: body.notes ?? null,
      ...actorToLastEditFields(actor),
      dataItems: body.dataItemIds ? { connect: body.dataItemIds.map((id: string) => ({ id })) } : undefined,
      scenarios: body.scenarioIds ? { connect: body.scenarioIds.map((id: string) => ({ id })) } : undefined,
    },
  });

  // FieldRevision · 把创建时的初始值全部记一次,reasoning 挂在「name」上
  const changes = ['name','category','description','likelihood','severity','legalClauses','strategy']
    .map((f) => ({ field: f, oldValue: null, newValue: (risk as any)[f] }));

  await writeFieldRevisions({
    projectId: project.id,
    resource: 'Risk',
    resourceId: risk.id,
    changes,
    actor,
    source: actor.type === 'AGENT' ? (req.url.includes('/mcp') ? 'MCP' : 'REST_API') : 'WEB',
    reasoning: reasoning ?? null,
  });

  // 引用源(citations) · 串到 Source + CitationLink
  const citationStats = await writeCitations(
    {
      organizationId: ctx.organizationId,
      projectId: project.id,
      resource: 'Risk',
      resourceId: risk.id,
      actor,
    },
    body.citations as CitationInput[] | undefined,
  );

  await logAudit({
    projectId: project.id,
    actor,
    resource: 'Risk',
    resourceId: risk.id,
    action: 'create',
    source: actor.type === 'AGENT' ? 'REST_API' : 'WEB',
    diff: { created: risk, citations: citationStats },
  });

  return created({
    ...risk,
    riskValue: risk.likelihood * risk.severity,
    riskLevel: riskLevelOf(risk.likelihood * risk.severity),
    citations: citationStats,
  });
}
