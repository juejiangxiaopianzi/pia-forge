import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth-session';
import { larkExchangeCode, sendLarkCard, bindSuccessCard, appBaseUrl } from '@/lib/lark';

export const dynamic = 'force-dynamic';

function back(query: string): NextResponse {
  return NextResponse.redirect(`${appBaseUrl()}/settings/lark-binding?${query}`);
}

/** 飞书授权回调：校验 state → code 换 open_id → 存 → 发绑定成功卡片 */
export async function GET(req: NextRequest) {
  const session = await requireSession();
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const saved = req.cookies.get('lark_oauth_state')?.value;

  if (!code || !state || !saved || state !== saved) {
    return back('err=' + encodeURIComponent('授权校验失败，请重试'));
  }

  let openId: string;
  let name: string | undefined;
  try {
    ({ openId, name } = await larkExchangeCode(code));
  } catch (e) {
    return back('err=' + encodeURIComponent(e instanceof Error ? e.message : '授权失败'));
  }

  try {
    await db.user.update({ where: { id: session.userId }, data: { larkOpenId: openId } });
  } catch (e: unknown) {
    const msg = (e as { code?: string })?.code === 'P2002'
      ? '这个飞书账号已被另一个用户绑定了'
      : '保存失败';
    return back('err=' + encodeURIComponent(msg));
  }

  // 发一张「绑定成功」卡片做端到端验证（失败不阻断）
  await sendLarkCard(openId, bindSuccessCard(name || '你', appBaseUrl()));

  const res = back('ok=1');
  res.cookies.set('lark_oauth_state', '', { maxAge: 0, path: '/' });
  return res;
}
