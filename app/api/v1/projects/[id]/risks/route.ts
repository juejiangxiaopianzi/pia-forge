import { db } from '@/lib/db';
import { verifyApiToken, requireScope } from '@/lib/api-auth';
import { ok, created, errUnauthorized, errBadRequest, errNotFound, errServer } from '@/lib/api-response';
import { logAudit } from '@/lib/audit-log';
import { riskValue, riskLevelOf } from '@/lib/risk';

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

  // 把计算字段加上方便外部 Agent 拿
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

  // 自动生成 code 如果没传
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
      dataItems: body.dataItemIds ? { connect: body.dataItemIds.map((id: string) => ({ id })) } : undefined,
      scenarios: body.scenarioIds ? { connect: body.scenarioIds.map((id: string) => ({ id })) } : undefined,
    },
  });

  await logAudit({
    projectId: project.id,
    userId: ctx.userId,
    resource: 'Risk',
    resourceId: risk.id,
    action: 'create',
    source: 'REST_API',
    agentName: req.headers.get('x-agent-name'),
    diff: { created: risk },
  });

  return created({ ...risk, riskValue: risk.likelihood * risk.severity });
}
