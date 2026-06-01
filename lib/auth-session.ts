/**
 * 浏览器 session · cookie + JWT
 * 跟 api-auth.ts 里的 Bearer Token 鉴权并列(API 走 token · 浏览器走 cookie)
 */

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

const COOKIE_NAME = 'pia_session';
const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'pia_forge_dev_only_change_in_prod',
);

export type SessionPayload = {
  userId: string;
  organizationId: string;
  email: string;
  name: string | null;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production' ? false : false, // 暂时 http
  });
}

export async function clearSession() {
  cookies().delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const c = cookies().get(COOKIE_NAME);
  if (!c) return null;
  try {
    const { payload } = await jwtVerify(c.value, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Error('UNAUTHENTICATED');
  return s;
}

/** 邀请码生成: 7 位短码 · 例 ABC-7K9(去掉容易混淆的 0 / O / I / 1) */
export function generateInviteCode(): string {
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n: number) =>
    Array.from({ length: n }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
  return `${pick(3)}-${pick(3)}`;
}

/** 加载完整用户(给签发 cookie 用) */
export async function loadUserForSession(userId: string): Promise<SessionPayload | null> {
  const u = await db.user.findUnique({
    where: { id: userId },
    include: { memberships: { include: { organization: true } } },
  });
  if (!u || u.memberships.length === 0) return null;
  return {
    userId: u.id,
    organizationId: u.memberships[0].organizationId,
    email: u.email,
    name: u.name,
  };
}
