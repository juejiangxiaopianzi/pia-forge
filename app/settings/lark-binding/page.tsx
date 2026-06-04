import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth-session';
import { larkConfigured, resolveLarkOpenId, sendLarkCard, bindSuccessCard } from '@/lib/lark';

export const dynamic = 'force-dynamic';

function appBaseUrl(): string {
  return process.env.NEXTAUTH_URL || 'http://47.237.111.215:3000';
}

export default async function LarkBindingPage({
  searchParams,
}: {
  searchParams: { ok?: string; err?: string };
}) {
  const session = await requireSession();
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, larkOpenId: true },
  });
  const configured = larkConfigured();

  async function bind(formData: FormData) {
    'use server';
    const s = await requireSession();
    const email = String(formData.get('email') || '').trim();
    const mobile = String(formData.get('mobile') || '').trim();

    if (!email && !mobile) {
      redirect('/settings/lark-binding?err=' + encodeURIComponent('请至少填邮箱或手机号'));
    }

    let openId: string | null = null;
    try {
      openId = await resolveLarkOpenId({ email: email || undefined, mobile: mobile || undefined });
    } catch (e) {
      redirect('/settings/lark-binding?err=' + encodeURIComponent(e instanceof Error ? e.message : '查询失败'));
    }
    if (!openId) {
      redirect('/settings/lark-binding?err=' + encodeURIComponent('飞书通讯录里没找到这个邮箱/手机号对应的人'));
    }

    try {
      await db.user.update({ where: { id: s.userId }, data: { larkOpenId: openId } });
    } catch (e: unknown) {
      // larkOpenId @unique · 被别人占了
      const msg = (e as { code?: string })?.code === 'P2002'
        ? '这个飞书账号已被另一个用户绑定了'
        : '保存失败';
      redirect('/settings/lark-binding?err=' + encodeURIComponent(msg));
    }

    // 发一张「绑定成功」卡片做端到端验证
    const me = await db.user.findUnique({ where: { id: s.userId }, select: { name: true } });
    await sendLarkCard(openId!, bindSuccessCard(me?.name || '你', appBaseUrl()));

    revalidatePath('/settings/lark-binding');
    redirect('/settings/lark-binding?ok=1');
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/settings" className="text-xs text-slate-500 hover:text-slate-900">← 返回设置</Link>
        <h1 className="mt-1 text-2xl font-semibold">绑定飞书</h1>
        <p className="mt-2 text-sm text-slate-500">
          绑定后，有审阅请求或任务指派给你时，PIA Forge 会直接飞书私信通知你（含一键打开链接）。
        </p>
      </div>

      {!configured && (
        <div className="card-soft border-l-2 border-l-amber-500 bg-amber-50/40 p-4 text-[13px] text-amber-800">
          ⚠️ 服务器还没配置飞书凭证（LARK_CLIENT_ID / LARK_CLIENT_SECRET），暂时无法绑定。请联系管理员。
        </div>
      )}

      {searchParams.ok && (
        <div className="card-soft border-l-2 border-l-green-500 bg-green-50/40 p-4 text-[13px] text-green-800">
          ✅ 绑定成功！已给你的飞书发了一张「绑定成功」卡片，去飞书看看收到没。
        </div>
      )}
      {searchParams.err && (
        <div className="card-soft border-l-2 border-l-red-500 bg-red-50/40 p-4 text-[13px] text-red-700">
          ❌ {searchParams.err}
        </div>
      )}

      <div className="card-soft p-6">
        <div className="mb-4 flex items-center gap-2 text-[13px]">
          <span className="text-slate-500">当前状态：</span>
          {user?.larkOpenId ? (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700">已绑定</span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">未绑定</span>
          )}
        </div>

        <form action={bind} className="space-y-5">
          <label className="block text-sm">
            <span className="block font-medium">飞书邮箱</span>
            <input name="email" type="email" placeholder="你登录飞书用的邮箱"
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
          </label>
          <div className="text-center text-[11px] text-slate-400">— 或 —</div>
          <label className="block text-sm">
            <span className="block font-medium">飞书手机号</span>
            <input name="mobile" placeholder="如 13800138000（带区号海外号加 +）"
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
          </label>
          <p className="text-[11px] text-slate-400">
            填任意一个即可。系统会去你公司飞书通讯录里匹配，拿到你的飞书身份（open_id）。
          </p>
          <div className="flex justify-end">
            <button type="submit" disabled={!configured}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40">
              绑定并发送测试通知
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
