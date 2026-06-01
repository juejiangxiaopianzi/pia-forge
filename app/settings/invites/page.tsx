import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireSession, generateInviteCode } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: '未使用', cls: 'chip-blue' },
  USED: { label: '已注册', cls: 'chip-green' },
  REVOKED: { label: '已吊销', cls: 'chip' },
  EXPIRED: { label: '已过期', cls: 'chip-amber' },
};

async function createInvite(formData: FormData) {
  'use server';
  const session = await requireSession();
  const note = String(formData.get('note') ?? '').trim();
  const expiry = String(formData.get('expiry') ?? '7');

  let expiresAt: Date | null = null;
  if (expiry !== 'forever') {
    const days = parseInt(expiry);
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  // 重试,避免短码碰撞
  for (let i = 0; i < 5; i++) {
    const code = generateInviteCode();
    const exists = await db.inviteCode.findUnique({ where: { code } });
    if (exists) continue;
    await db.inviteCode.create({
      data: {
        organizationId: session.organizationId,
        code,
        note: note || null,
        createdByUserId: session.userId,
        expiresAt,
        status: 'ACTIVE',
      },
    });
    break;
  }
  revalidatePath('/settings/invites');
}

async function revokeInvite(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  await db.inviteCode.update({ where: { id }, data: { status: 'REVOKED' } });
  revalidatePath('/settings/invites');
}

async function deleteInvite(formData: FormData) {
  'use server';
  const id = String(formData.get('id') ?? '');
  await db.inviteCode.delete({ where: { id } });
  revalidatePath('/settings/invites');
}

export default async function InvitesPage() {
  const session = await requireSession();
  const invites = await db.inviteCode.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { createdAt: 'desc' },
    include: { usedBy: { select: { name: true, email: true } } },
  });

  // 标记已过期
  const now = new Date();
  const visualInvites = invites.map((inv) => {
    if (inv.status === 'ACTIVE' && inv.expiresAt && inv.expiresAt < now) {
      return { ...inv, status: 'EXPIRED' as const };
    }
    return inv;
  });

  const activeCount = visualInvites.filter((i) => i.status === 'ACTIVE').length;
  const usedCount = visualInvites.filter((i) => i.status === 'USED').length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">设置 · 邀请管理</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">邀请码</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-slate-500">
          生成邀请码,把链接发给合规同行,他们用这串码注册账号后就能登录 PIA Forge。一码一人 · 用完作废 · 你可随时吊销。
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[12px]">
        <span className="text-slate-500">本组织 {visualInvites.length} 条邀请码:</span>
        <span className="chip-blue">未使用 {activeCount}</span>
        <span className="chip-green">已注册 {usedCount}</span>
      </div>

      <form action={createInvite} className="card-soft p-5">
        <h2 className="text-[14px] font-semibold">生成新邀请码</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_120px]">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500">备注(给谁)</label>
            <input
              name="note"
              placeholder="例: cherry / 张三 / 试用"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500">有效期</label>
            <select
              name="expiry"
              defaultValue="7"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] focus:border-blue-500 focus:outline-none"
            >
              <option value="7">7 天</option>
              <option value="30">30 天</option>
              <option value="90">90 天</option>
              <option value="forever">永久</option>
            </select>
          </div>
          <button type="submit" className="btn-primary self-end">生成</button>
        </div>
      </form>

      <div className="card-soft overflow-hidden">
        {visualInvites.length === 0 ? (
          <div className="p-10 text-center text-[13px] text-slate-400">还没有邀请码 · 上面生成第一条</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50/60 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">备注</th>
                <th className="px-4 py-3">邀请码</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">注册人 / 有效期</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {visualInvites.map((inv) => {
                const meta = STATUS_LABEL[inv.status];
                const signupUrl = `/signup?code=${inv.code}`;
                return (
                  <tr key={inv.id} className="border-t border-slate-100 align-top hover:bg-blue-50/30">
                    <td className="px-4 py-3 text-slate-900">{inv.note || <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-[13px] font-semibold tracking-wider text-slate-900">{inv.code}</div>
                      {inv.status === 'ACTIVE' && (
                        <CopyLink path={signupUrl} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={meta.cls}>{meta.label}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-500">
                      {inv.status === 'USED' && inv.usedBy ? (
                        <span>{inv.usedBy.name} <span className="text-slate-400">({inv.usedBy.email})</span></span>
                      ) : inv.expiresAt ? (
                        <span>到期 {inv.expiresAt.toLocaleDateString('zh-CN')}</span>
                      ) : (
                        <span>永久有效</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.status === 'ACTIVE' && (
                        <form action={revokeInvite} className="inline">
                          <input type="hidden" name="id" value={inv.id} />
                          <button type="submit" className="text-[12px] text-amber-700 hover:underline">吊销</button>
                        </form>
                      )}
                      {(inv.status === 'REVOKED' || inv.status === 'EXPIRED' || inv.status === 'USED') && (
                        <form action={deleteInvite} className="inline">
                          <input type="hidden" name="id" value={inv.id} />
                          <button type="submit" className="text-[12px] text-slate-500 hover:text-red-600">删除</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card-soft border-l-2 border-l-blue-500 bg-blue-50/30 p-5 text-[12px] leading-relaxed text-slate-600">
        <p className="font-semibold text-slate-800">怎么用?</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>「生成」一条邀请码 · 写清备注「给谁」</li>
          <li>点列表里邀请码下面的「复制注册链接」 · 发给对方</li>
          <li>对方打开链接 · 填邮箱密码 · 注册成功自动登录</li>
          <li>码用完(已注册)后状态变成「已注册」· 不能再用</li>
          <li>没用的码想取消 → 点「吊销」</li>
        </ol>
      </div>
    </div>
  );
}

function CopyLink({ path }: { path: string }) {
  return (
    <div className="mt-1">
      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        className="text-[11px] text-blue-600 hover:underline"
      >
        复制注册链接 ↗
      </a>
    </div>
  );
}
