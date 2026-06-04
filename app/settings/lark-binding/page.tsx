import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/auth-session';
import { larkConfigured, resolveLarkOpenId, sendLarkCard, bindSuccessCard, appBaseUrl } from '@/lib/lark';

export const dynamic = 'force-dynamic';

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

  // 备选：手动用邮箱/手机绑定（需要应用开通讯录权限）
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
      const msg = (e as { code?: string })?.code === 'P2002' ? '这个飞书账号已被另一个用户绑定了' : '保存失败';
      redirect('/settings/lark-binding?err=' + encodeURIComponent(msg));
    }
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
          ⚠️ 服务器还没配置飞书凭证（LARK_CLIENT_ID / LARK_CLIENT_SECRET），暂时无法绑定。
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

      {/* 当前状态 */}
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-slate-500">当前状态：</span>
        {user?.larkOpenId ? (
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-green-700">已绑定</span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">未绑定</span>
        )}
      </div>

      {/* 主方式：飞书一键授权 */}
      <div className="card-soft p-6 text-center">
        <p className="text-[15px] font-semibold text-slate-900">用飞书一键绑定</p>
        <p className="mt-1 text-[12px] text-slate-500">点下方按钮，在飞书里确认授权即可 · 无需手填任何信息</p>
        <a
          href="/api/lark/oauth/start"
          className={`mt-4 inline-block rounded-xl px-6 py-2.5 text-sm font-medium text-white ${
            configured ? 'bg-blue-600 hover:bg-blue-700' : 'pointer-events-none bg-slate-300'
          }`}
        >
          🔗 用飞书授权绑定
        </a>
      </div>

      {/* 备选：手动绑定 */}
      <details className="card-soft p-6">
        <summary className="cursor-pointer text-[13px] font-medium text-slate-600">
          手动绑定（备选 · 填邮箱或手机号）
        </summary>
        <form action={bind} className="mt-4 space-y-5">
          <label className="block text-sm">
            <span className="block font-medium">飞书邮箱</span>
            <input name="email" type="email" placeholder="你登录飞书用的邮箱"
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
          </label>
          <div className="text-center text-[11px] text-slate-400">— 或 —</div>
          <label className="block text-sm">
            <span className="block font-medium">飞书手机号</span>
            <input name="mobile" placeholder="如 13800138000"
              className="ring-focus mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
          </label>
          <p className="text-[11px] text-slate-400">注：手动绑定需应用开通讯录权限；推荐用上方飞书一键授权。</p>
          <div className="flex justify-end">
            <button type="submit" disabled={!configured}
              className="rounded-xl bg-slate-700 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40">
              手动绑定
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
