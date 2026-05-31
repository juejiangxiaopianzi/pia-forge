/**
 * API Token 鉴权 · 给 REST API 和 MCP server 共用
 *
 * Token 格式：`pia_<prefix8>.<secret32>` ·  prefix8 用于 UI 区分，secret32 hash 后存数据库
 * 验证流程：取 prefix → 数据库找 token → 用 secret 算 sha256 → 比对 hashedToken
 */

import { createHash, randomBytes } from 'crypto';
import { db } from '@/lib/db';
import type { ApiToken, TokenScope } from '@prisma/client';

const TOKEN_PREFIX = 'pia';

export type AuthContext = {
  token: ApiToken;
  userId: string;
  organizationId: string;
  scopes: TokenScope[];
  /// 当 token 绑定到 Agent 时,actor 应被视为 AGENT
  agentId: string | null;
};

export function generateApiToken(): { plaintext: string; prefix: string; hashed: string } {
  const prefixPart = randomBytes(4).toString('hex'); // 8 hex chars
  const secretPart = randomBytes(16).toString('hex'); // 32 hex chars
  const plaintext = `${TOKEN_PREFIX}_${prefixPart}.${secretPart}`;
  const prefix = `${TOKEN_PREFIX}_${prefixPart}`;
  const hashed = createHash('sha256').update(plaintext).digest('hex');
  return { plaintext, prefix, hashed };
}

/**
 * 验证 Bearer Token，返回 AuthContext 或 null
 */
export async function verifyApiToken(authHeader: string | null | undefined): Promise<AuthContext | null> {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const plaintext = match[1].trim();

  // 解析 prefix
  const dotIdx = plaintext.indexOf('.');
  if (dotIdx < 0) return null;
  const prefix = plaintext.slice(0, dotIdx);

  const hashed = createHash('sha256').update(plaintext).digest('hex');

  const token = await db.apiToken.findUnique({ where: { hashedToken: hashed } });
  if (!token) return null;
  if (token.revokedAt) return null;
  if (token.expiresAt && token.expiresAt < new Date()) return null;
  if (token.prefix !== prefix) return null;

  // 更新最近使用时间（best-effort，不阻塞）
  db.apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return {
    token,
    userId: token.userId,
    organizationId: token.organizationId,
    scopes: token.scopes,
    agentId: token.agentId,
  };
}

export function hasScope(ctx: AuthContext, scope: TokenScope): boolean {
  return ctx.scopes.includes('ADMIN') || ctx.scopes.includes(scope);
}

export function requireScope(ctx: AuthContext, scope: TokenScope) {
  if (!hasScope(ctx, scope)) {
    const err = new Error(`Missing required scope: ${scope}`);
    (err as any).status = 403;
    throw err;
  }
}
