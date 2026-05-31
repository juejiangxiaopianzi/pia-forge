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
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">设置</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">系统设置</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
          配置你的 PIA Forge 实例 · 颁发 API Token · 接入飞书与 Webhook。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {SETTINGS.map((s) => {
          const isAvailable = s.status === '可用';
          return (
            <Link
              key={s.href}
              href={s.href}
              className="card-soft card-hover block p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] font-semibold text-slate-900">{s.title}</p>
                <span className={isAvailable ? 'chip-blue' : 'chip'}>{s.status}</span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-500">{s.desc}</p>
              {isAvailable && (
                <p className="mt-3 text-[11px] font-medium text-blue-600">前往配置 →</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
