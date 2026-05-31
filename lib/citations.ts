/**
 * Citation 写入工具
 * 接受 citations payload(来自 REST/MCP/Web) → upsert Source + 创建 CitationLink
 *
 * payload 形态:
 *   citations: [
 *     {
 *       type: 'GITHUB_FILE',                                       // SourceType
 *       uri: 'github://owner/repo/path@sha',                       // 稳定标识(含版本)
 *       title?: '简历照片定性论证 v2',
 *       excerpt?: '抓取时的全文片段...',                            // 防原文失效
 *       citationType: 'EVIDENCE',                                   // CitationType
 *       citationExcerpt?: '这一段说明照片不构成生物识别',
 *       scope?: 'PROJECT' | 'PRIVATE' | 'ORG',                     // 默认 PROJECT
 *     }
 *   ]
 */

import { db } from '@/lib/db';
import type { Actor } from '@/lib/actor';

export type CitationInput = {
  type: string; // SourceType
  uri: string;
  title?: string;
  excerpt?: string;
  citationType: string; // CitationType
  citationExcerpt?: string;
  scope?: string;
};

export type CitationWriteContext = {
  organizationId: string;
  projectId?: string;
  resource: string; // 'Risk' / 'DataItem' / 'Mitigation' / 'Conclusion' / 'PiaProject'
  resourceId: string;
  actor: Actor;
};

/**
 * 写入一组 citations · 自动 upsert Source(按 organizationId+uri 唯一) · 写 CitationLink
 * 返回 { sourcesAffected, citationLinksCreated }
 */
export async function writeCitations(
  ctx: CitationWriteContext,
  citations: CitationInput[] | undefined | null,
): Promise<{ sourcesAffected: number; citationLinksCreated: number }> {
  if (!citations || citations.length === 0) {
    return { sourcesAffected: 0, citationLinksCreated: 0 };
  }

  let sourcesAffected = 0;
  let citationLinksCreated = 0;

  for (const c of citations) {
    if (!c.uri || !c.type || !c.citationType) continue;

    const source = await db.source.upsert({
      where: {
        organizationId_uri: {
          organizationId: ctx.organizationId,
          uri: c.uri,
        },
      },
      update: {
        // 已存在的 Source 不强制覆盖 title/excerpt,但补全 excerpt
        title: c.title ?? undefined,
        excerpt: c.excerpt ?? undefined,
      },
      create: {
        organizationId: ctx.organizationId,
        type: c.type as any,
        uri: c.uri,
        title: c.title ?? null,
        excerpt: c.excerpt ?? null,
        capturedByActorType: ctx.actor.type as any,
        capturedByUserId: ctx.actor.userId,
        capturedByAgentId: ctx.actor.agentId,
        scope: (c.scope ?? 'PROJECT') as any,
        projectId: ctx.projectId ?? null,
      },
    });
    sourcesAffected++;

    await db.citationLink.create({
      data: {
        fromType: ctx.resource,
        fromId: ctx.resourceId,
        toSourceId: source.id,
        citationType: c.citationType as any,
        excerpt: c.citationExcerpt ?? null,
        citedByActorType: ctx.actor.type as any,
        citedByUserId: ctx.actor.userId,
        citedByAgentId: ctx.actor.agentId,
      },
    });
    citationLinksCreated++;
  }

  return { sourcesAffected, citationLinksCreated };
}

/**
 * URI → 可访问 URL · 把 github://owner/repo/path@sha 转成 https://github.com/.../blob/sha/path
 * 不能转的就返回原 uri
 */
export function sourceUriToHref(type: string, uri: string): { href: string; label: string } {
  if (!uri) return { href: '', label: '' };

  if (type === 'GITHUB_FILE' && uri.startsWith('github://')) {
    // github://owner/repo/path@sha
    const m = uri.replace('github://', '').match(/^([^/]+)\/([^/]+)\/(.+?)@([a-f0-9]+)$/i);
    if (m) {
      const [, owner, repo, path, sha] = m;
      return {
        href: `https://github.com/${owner}/${repo}/blob/${sha}/${path}`,
        label: `${owner}/${repo} @ ${sha.slice(0, 7)}`,
      };
    }
    // 没绑定 sha 的退化
    const m2 = uri.replace('github://', '').match(/^([^/]+)\/([^/]+)\/(.+)$/);
    if (m2) {
      const [, owner, repo, path] = m2;
      return { href: `https://github.com/${owner}/${repo}/blob/main/${path}`, label: `${owner}/${repo}` };
    }
  }

  if (type === 'FEISHU_DOC' || type === 'FEISHU_WIKI') {
    // feishu://docx/TOKEN 或 https://xx.feishu.cn/wiki/TOKEN
    if (uri.startsWith('http')) return { href: uri, label: '飞书原文' };
    const m = uri.match(/^feishu:\/\/(docx|wiki|sheet|bitable)\/(.+)$/);
    if (m) return { href: '#', label: `飞书 ${m[1]} · ${m[2].slice(0, 8)}...` };
  }

  if (uri.startsWith('http')) return { href: uri, label: uri.replace(/^https?:\/\//, '') };

  return { href: '#', label: uri };
}
