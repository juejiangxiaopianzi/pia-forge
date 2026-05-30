import Link from 'next/link';
import { db } from '@/lib/db';
import { riskValue, riskLevelOf, RISK_LEVEL_LABEL, RISK_LEVEL_COLOR } from '@/lib/risk';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // 首屏直接展示所有 PIA 项目的全景指标
  const projects = await db.piaProject.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { dataItems: true, scenarios: true, risks: true, mitigations: true } },
      risks: { select: { likelihood: true, severity: true } },
    },
  });

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-medium tracking-wider text-violet-700">PERSONAL INFORMATION PROTECTION IMPACT ASSESSMENT</p>
          <h1 className="text-4xl font-bold tracking-tight">把一次性的合规判断 · 沉淀成可复用的评估资产。</h1>
          <p className="text-base text-muted-foreground">
            PIA Forge 是一个开源的「个人信息保护影响评估」工作台。一份 PIA = 1 个项目 + 7 张协作表 + 1 个仪表盘 + 1 份可签字报告。
            支持私有部署到阿里云，数据不出您的服务器。
          </p>
          <div className="flex gap-3 pt-2">
            <Link
              href="/projects/new"
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
            >
              新建评估项目
            </Link>
            <Link
              href="/projects"
              className="rounded-lg border bg-white px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              查看现有评估
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">评估项目</h2>
          <span className="text-sm text-muted-foreground">{projects.length} 个</span>
        </div>
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            还没有评估项目。<Link href="/projects/new" className="text-violet-600 hover:underline">创建第一个 →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {projects.map((p) => {
              const highCount = p.risks.filter((r) => {
                const lv = riskLevelOf(riskValue(r.likelihood, r.severity));
                return lv === 'HIGH';
              }).length;
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="rounded-xl border bg-white p-5 transition hover:border-violet-300 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{p.code} · {p.version}</p>
                      <h3 className="mt-1 text-base font-medium">{p.title}</h3>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${RISK_LEVEL_COLOR[p.residualLevel]}`}>
                      残余 · {RISK_LEVEL_LABEL[p.residualLevel]}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <Stat label="信息项" value={p._count.dataItems} />
                    <Stat label="场景" value={p._count.scenarios} />
                    <Stat label="风险" value={p._count.risks} sub={`高 ${highCount}`} />
                    <Stat label="措施" value={p._count.mitigations} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub && <div className="text-[10px] text-red-500">{sub}</div>}
    </div>
  );
}
