import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireSession } from '@/lib/auth-session';
import { larkAuthorizeUrl, larkConfigured } from '@/lib/lark';

export const dynamic = 'force-dynamic';

/** 发起飞书一键授权：校验登录 → 生成 state → 跳转飞书授权页 */
export async function GET() {
  await requireSession(); // 未登录会抛，由中间件/错误页兜底
  if (!larkConfigured()) {
    return NextResponse.json({ error: '服务器未配置飞书凭证' }, { status: 500 });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const res = NextResponse.redirect(larkAuthorizeUrl(state));
  res.cookies.set('lark_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return res;
}
