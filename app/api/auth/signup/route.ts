import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSession, loadUserForSession } from '@/lib/auth-session';

export async function POST(req: Request) {
  const body = await req.json();
  const code = String(body.code ?? '').trim().toUpperCase();
  const email = String(body.email ?? '').trim().toLowerCase();
  const name = String(body.name ?? '').trim();
  const password = String(body.password ?? '');

  if (!code || !email || !name || !password) {
    return NextResponse.json({ error: '所有字段必填' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: '密码至少 8 位' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: '邮箱格式不对' }, { status: 400 });
  }

  // 校验邀请码
  const invite = await db.inviteCode.findUnique({ where: { code } });
  if (!invite) return NextResponse.json({ error: '邀请码不存在' }, { status: 400 });
  if (invite.status !== 'ACTIVE') return NextResponse.json({ error: '邀请码已失效' }, { status: 400 });
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    await db.inviteCode.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
    return NextResponse.json({ error: '邀请码已过期' }, { status: 400 });
  }

  // 检查邮箱不重复
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: '邮箱已注册' }, { status: 400 });

  // 创建 user + membership + 标邀请码已用
  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash,
      memberships: {
        create: { organizationId: invite.organizationId, role: 'MEMBER' },
      },
    },
  });

  await db.inviteCode.update({
    where: { id: invite.id },
    data: { status: 'USED', usedByUserId: user.id, usedAt: new Date() },
  });

  const session = await loadUserForSession(user.id);
  if (session) await createSession(session);

  return NextResponse.json({ ok: true, user: { email: user.email, name: user.name } });
}
