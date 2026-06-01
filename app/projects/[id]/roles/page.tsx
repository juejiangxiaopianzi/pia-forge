import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import Breadcrumb from '@/components/Breadcrumb';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, { label: string; icon: string; cls: string }> = {
  PIA_LEAD:           { label: 'PIA 主理人',         icon: '👑', cls: 'bg-blue-50 text-blue-700' },
  LEGAL_LEAD:         { label: '法务负责人',         icon: '⚖️', cls: 'bg-violet-50 text-violet-700' },
  C_END_PRODUCT:      { label: 'C 端产品',           icon: '📱', cls: 'bg-amber-50 text-amber-700' },
  B_END_PRODUCT:      { label: 'B 端产品',           icon: '🏢', cls: 'bg-amber-50 text-amber-700' },
  DATA_TEAM:          { label: '数据团队',           icon: '📊', cls: 'bg-emerald-50 text-emerald-700' },
  ENGINEERING:        { label: '研发',               icon: '⚙️', cls: 'bg-slate-100 text-slate-700' },
  SECURITY_AUDIT:     { label: '安全审核',           icon: '🛡️', cls: 'bg-red-50 text-red-700' },
  COMPLIANCE_OFFICER: { label: '合规专员',           icon: '📋', cls: 'bg-blue-50 text-blue-700' },
  EXEC_APPROVER:      { label: 'CTO / 高管',         icon: '🎖️', cls: 'bg-violet-100 text-violet-800' },
  EXTERNAL_COUNSEL:   { label: '外部法律顾问',       icon: '📜', cls: 'bg-slate-100 text-slate-700' },
};

const STAGE_LABEL: Record<string, string> = {
  S0_SCOPE: '准备', S1_DATAFLOW: '映射', S2_IDENTIFY: '识别',
  S3_RATE: '评级', S4_MITIGATE: '处置', S5_REPORT: '报告',
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  NOT_STARTED: { label: '未开始',   cls: 'chip' },
  IN_PROGRESS: { label: '进行中',   cls: 'chip-blue' },
  DONE:        { label: '已完成',   cls: 'chip-green' },
  OVERDUE:     { label: '逾期',     cls: 'chip-red' },
  BLOCKED:     { label: '阻塞',     cls: 'chip-amber' },
};

const RACI_DESC: Record<string, { label: string; cls: string }> = {
  R: { label: 'R · 执行', cls: 'bg-blue-600 text-white' },
  A: { label: 'A · 负责', cls: 'bg-red-600 text-white' },
  C: { label: 'C · 咨询', cls: 'bg-amber-500 text-white' },
  I: { label: 'I · 知会', cls: 'bg-slate-500 text-white' },
};

export default async function RolesPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();

  const roles = await db.piaRole.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: 'asc' },
    include: { user: true },
  });

  const STAGES = ['S0_SCOPE', 'S1_DATAFLOW', 'S2_IDENTIFY', 'S3_RATE', 'S4_MITIGATE', 'S5_REPORT'];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: '评估', href: '/projects' },
        { label: project.code, href: `/projects/${project.id}` },
        { label: '角色 RACI' },
      ]} />

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">02 评估组织 · GB/T 39335 §5.3</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">角色与职责 · RACI 矩阵</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-slate-500">
          按 GB/T 39335 5.3 评估组织的角色定义,明确每个角色在 PIA 6 个阶段(准备/映射/识别/评级/处置/报告)的责任划分 + 应交付物 + 截止时间。
        </p>
      </div>

      {roles.length === 0 ? (
        <div className="card-soft p-10 text-center text-[13px] text-slate-400">
          还没有角色 · Agent 通过 MCP 起草 PIA 时会自动登记
        </div>
      ) : (
        <>
          {/* RACI 速查表(对每个阶段每个角色的 R/A/C/I) */}
          <div className="card-soft p-5">
            <h2 className="text-[15px] font-semibold">RACI 阶段矩阵</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              R 执行 · A 负责(总责) · C 咨询 · I 知会 ｜ 每个 PIA 阶段每条角色的责任位
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2 font-medium">角色</th>
                    {STAGES.map((s) => (
                      <th key={s} className="px-2 py-2 font-medium text-center">{STAGE_LABEL[s]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => {
                    const meta = ROLE_LABEL[r.roleType] ?? { label: r.roleType, icon: '👤', cls: 'chip' };
                    return (
                      <tr key={r.id} className="border-b border-slate-100">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-md px-2 py-0.5 text-[10px] ${meta.cls}`}>{meta.icon} {meta.label}</span>
                          </div>
                        </td>
                        {STAGES.map((s) => {
                          const involved = r.stages.includes(s as any);
                          return (
                            <td key={s} className="px-2 py-2.5 text-center">
                              {involved ? (
                                <div className="flex items-center justify-center gap-0.5">
                                  {r.raciFlags.map((flag) => (
                                    <span key={flag} className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${RACI_DESC[flag].cls}`}>
                                      {flag}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-200">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              {Object.entries(RACI_DESC).map(([k, v]) => (
                <span key={k} className={`rounded px-2 py-1 ${v.cls}`}>{v.label}</span>
              ))}
            </div>
          </div>

          {/* 详细角色卡 */}
          <div className="grid gap-4 md:grid-cols-2">
            {roles.map((r) => {
              const meta = ROLE_LABEL[r.roleType] ?? { label: r.roleType, icon: '👤', cls: 'chip' };
              const st = STATUS_META[r.status];
              return (
                <article key={r.id} className="card-soft p-5">
                  <header className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-lg px-2 py-0.5 text-[10px] ${meta.cls}`}>{meta.icon} {meta.label}</span>
                        <span className={st.cls}>{st.label}</span>
                      </div>
                      <h3 className="mt-2 text-[14px] font-semibold text-slate-900">{r.shortLabel}</h3>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {r.user?.name ?? '👤 待指派'}
                        {r.organization && <span className="ml-2 text-slate-400">· {r.organization}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">截止</p>
                      <p className="font-mono text-[11px] text-slate-700">
                        {r.dueAt?.toLocaleDateString('zh-CN') ?? '—'}
                      </p>
                    </div>
                  </header>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">职责</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-700">{r.duties}</p>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">应交付物</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-700">{r.deliverable}</p>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">参与阶段</span>
                    {r.stages.map((s) => (
                      <span key={s} className="chip-blue text-[10px]">{STAGE_LABEL[s] ?? s}</span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
