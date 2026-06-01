import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createSession, loadUserForSession } from '@/lib/auth-session';

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  if (!email || !password) {
    return NextResponse.json({ error: '邮箱和密码必填' }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }

  const session = await loadUserForSession(user.id);
  if (!session) {
    return NextResponse.json({ error: '账号未绑定组织' }, { status: 403 });
  }

  await createSession(session);
  return NextResponse.json({ ok: true, user: { email: session.email, name: session.name } });
}
