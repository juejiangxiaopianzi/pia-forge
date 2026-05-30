/**
 * GET  /api/v1/projects                 列出当前 token 所属组织的全部评估项目
 * POST /api/v1/projects                 创建新评估项目（PIA / AUDIT / FILING / NOTICE / INCIDENT）
 *
 * 鉴权：Bearer Token · scopes = READ_PROJECTS / WRITE_PROJECTS
 */

import { db } from '@/lib/db';
import { verifyApiToken, requireScope } from '@/lib/api-auth';
import { ok, created, errUnauthorized, errBadRequest, errServer } from '@/lib/api-response';
import { logAudit } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try {
    requireScope(ctx, 'READ_PROJECTS');
  } catch (e: any) {
    return errServer(e.message);
  }

  const projects = await db.piaProject.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { risks: true, mitigations: true, dataItems: true, scenarios: true } },
    },
  });
  return ok(projects);
}

export async function POST(req: Request) {
  const ctx = await verifyApiToken(req.headers.get('authorization'));
  if (!ctx) return errUnauthorized();
  try {
    requireScope(ctx, 'WRITE_PROJECTS');
  } catch (e: any) {
    return errServer(e.message);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return errBadRequest('请求体必须是合法 JSON');
  }

  if (!body.title) return errBadRequest('title 必填');
  if (!body.code) return errBadRequest('code 必填（如 PIA-XYZ-001）');

  const project = await db.piaProject.create({
    data: {
      organizationId: ctx.organizationId,
      assessmentType: body.assessmentType ?? 'PIA',
      code: body.code,
      title: body.title,
      scope: body.scope ?? '',
      purpose: body.purpose ?? '',
      legalBases: body.legalBases ?? [],
      startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
      targetDoneAt: body.targetDoneAt ? new Date(body.targetDoneAt) : null,
      leaderId: body.leaderId ?? ctx.userId,
      reviewTriggers: body.reviewTriggers ?? '',
      version: body.version ?? 'v0.1',
    },
  });

  await logAudit({
    projectId: project.id,
    userId: ctx.userId,
    resource: 'PiaProject',
    resourceId: project.id,
    action: 'create',
    source: 'REST_API',
    agentName: req.headers.get('x-agent-name'),
    diff: { created: project },
  });

  return created(project);
}
