import Link from 'next/link';

export const dynamic = 'force-dynamic';

const SETTINGS = [
  {
    title: 'API Tokens',
    desc: '管理 REST API / MCP Server 的访问 Token · 颁发给你的 Agent 和第三方系统',
    href: '/settings/tokens',
    status: '可用',
  },
  {
    title: '组织与成员',
    desc: '组织信息 · 成员邀请 · 角色权限',
    href: '/settings/organization',
    status: '规划中 · v0.2',
  },
  {
    title: '飞书集成',
    desc: '飞书 OAuth 登录 · 飞书云文档同步报告 · 飞书 IM 提醒',
    href: '/settings/lark',
    status: '规划中 · v0.2',
  },
  {
    title: 'Webhook',
    desc: '评估签字 / 风险高发 / 措施逾期等事件推送到你的 IM 或 Agent',
    href: '/settings/webhooks',
    status: '规划中 · v0.3',
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">设置</p>
        <h1 className="mt-1 text-2xl font-semibold">系统设置</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          配置你的 PIA Forge 实例 · 颁发 API Token · 接入飞书与 Webhook
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {SETTINGS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="card-soft block p-5 transition hover:border-violet-300"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{s.title}</p>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">{s.status}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
