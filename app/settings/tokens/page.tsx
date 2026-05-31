import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { generateApiToken } from '@/lib/api-auth';
import type { TokenScope } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ALL_SCOPES: TokenScope[] = [
  'READ_PROJECTS', 'WRITE_PROJECTS',
  'READ_RISKS', 'WRITE_RISKS',
  'READ_MITIGATIONS', 'WRITE_MITIGATIONS',
  'READ_CONCLUSIONS', 'WRITE_CONCLUSIONS',
  'GENERATE_REPORT',
  'ADMIN',
];

async function createToken(formData: FormData): Promise<{ plaintext?: string }> {
  'use server';
  const name = String(formData.get('name') || '').trim() || '未命名 Token';
  const scopeStr = String(formData.get('scopes') || 'ADMIN');
  const scopes = scopeStr.split(',').filter(Boolean) as TokenScope[];

  const org = await db.organization.findFirst();
  const user = await db.user.findFirst();
  if (!org || !user) return {};

  const { plaintext, prefix, hashed } = generateApiToken();
  await db.apiToken.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      name,
      prefix,
      hashedToken: hashed,
      scopes,
    },
  });
  revalidatePath('/settings/tokens');
  return { plaintext };
}

async function revokeToken(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  await db.apiToken.update({ where: { id }, data: { revokedAt: new Date() } });
  revalidatePath('/settings/tokens');
}

export default async function TokensPage({ searchParams }: { searchParams: { new?: string } }) {
  const org = await db.organization.findFirst();
  const tokens = org
    ? await db.apiToken.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      })
    : [];

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">设置</p>
        <h1 className="mt-1 text-2xl font-semibold">API Tokens</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          给你的 Agent / 第三方系统颁发 Token。每个 Token 绑定到一个用户和一组 scopes。Token 只在创建时显示一次，请妥善保存。
        </p>
      </div>

      {searchParams.new && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">新 Token 已生成 · 仅显示这一次</p>
          <code className="mt-2 block break-all rounded bg-white p-3 font-mono text-xs">{searchParams.new}</code>
          <p className="mt-2 text-xs text-blue-700">
            复制保存到密码管理器或你的 Agent 配置里。关闭本页后无法再次查看。
          </p>
        </div>
      )}

      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-base font-medium">新建 Token</h2>
        <form
          action={async (fd) => {
            'use server';
            const r = await createToken(fd);
            if (r.plaintext) {
              const { redirect } = await import('next/navigation');
              redirect(`/settings/tokens?new=${encodeURIComponent(r.plaintext)}`);
            }
          }}
          className="mt-4 space-y-4"
        >
          <label className="block text-sm">
            <span className="block font-medium">Token 备注</span>
            <input
              name="name"
              required
              placeholder="如：我的 Claude Code · 我的 Cursor · 部门内审 Agent"
              className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block text-sm">
            <span className="block font-medium">Scopes（逗号分隔）</span>
            <input
              name="scopes"
              defaultValue="ADMIN"
              className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2 font-mono text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              可用：{ALL_SCOPES.join(' · ')}
            </p>
          </label>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            生成 Token
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-base font-medium">现有 Tokens（{tokens.length}）</h2>
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3">名称</th>
                <th className="px-3 py-3">Prefix</th>
                <th className="px-3 py-3">Scopes</th>
                <th className="px-3 py-3">创建</th>
                <th className="px-3 py-3">上次使用</th>
                <th className="px-3 py-3">状态</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {tokens.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">还没有 Token</td></tr>
              )}
              {tokens.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.user?.name || t.user?.email}</p>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{t.prefix}...</td>
                  <td className="px-3 py-3 text-xs">
                    {t.scopes.slice(0, 2).join(' / ')}{t.scopes.length > 2 && ` +${t.scopes.length - 2}`}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {t.createdAt.toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {t.lastUsedAt ? t.lastUsedAt.toLocaleDateString('zh-CN') : '—'}
                  </td>
                  <td className="px-3 py-3">
                    {t.revokedAt ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">已吊销</span>
                    ) : t.expiresAt && t.expiresAt < new Date() ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">过期</span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">有效</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {!t.revokedAt && (
                      <form action={revokeToken}>
                        <input type="hidden" name="id" value={t.id} />
                        <button className="text-xs text-red-600 hover:underline" type="submit">吊销</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border bg-gray-50 p-5 text-sm">
        <h3 className="font-medium">怎么用</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          - REST API：详见 <a className="text-blue-700 hover:underline" href="/docs/api">/docs/api</a>
        </p>
        <p className="text-xs text-muted-foreground">
          - MCP Server：详见 <a className="text-blue-700 hover:underline" href="/docs/mcp">/docs/mcp</a>
        </p>
        <p className="text-xs text-muted-foreground">
          - Skill Pack：详见仓库 <code className="rounded bg-white px-1">skills/</code> 目录
        </p>
      </section>
    </div>
  );
}
