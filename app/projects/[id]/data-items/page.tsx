import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import Breadcrumb from '@/components/Breadcrumb';
import { labelsFor } from '@/lib/module-labels';

export const dynamic = 'force-dynamic';

const CLASS_LABEL: Record<string, { label: string; cls: string }> = {
  SENSITIVE: { label: '敏感个人信息', cls: 'chip-red' },
  GENERAL:   { label: '一般个人信息', cls: 'chip-blue' },
  NON_PI:    { label: '非个人信息',   cls: 'chip' },
  DISPUTED:  { label: '存争议待裁定', cls: 'chip-amber' },
};

const LEGAL_BASIS_LABEL: Record<string, { label: string; ref: string; cls: string }> = {
  SEPARATE_CONSENT:   { label: '单独同意',     ref: 'PIPL §14',     cls: 'chip-amber' },
  GENERAL_CONSENT:    { label: '一般同意',     ref: 'PIPL §13(一)', cls: 'chip-blue' },
  CONTRACT_NECESSITY: { label: '合同所必需',   ref: 'PIPL §13(一)', cls: 'chip-blue' },
  LEGAL_OBLIGATION:   { label: '履行法定义务', ref: 'PIPL §13(三)', cls: 'chip' },
  PUBLIC_INTEREST:    { label: '公共利益',     ref: 'PIPL §13(四)', cls: 'chip' },
  EMERGENCY:          { label: '紧急情况',     ref: 'PIPL §13(五)', cls: 'chip' },
  PUBLIC_INFO:        { label: '已合法公开',   ref: 'PIPL §13(七)', cls: 'chip' },
  OTHER:              { label: '其他依据',     ref: '',             cls: 'chip' },
};

const SENSITIVE_SUB_LABEL: Record<string, string> = {
  BIOMETRIC:            '生物识别',
  SPECIFIC_IDENTITY:    '特定身份',
  MEDICAL_HEALTH:       '医疗健康',
  FINANCIAL:            '金融账户',
  WHEREABOUTS:          '行踪轨迹',
  MINOR_UNDER_14:       '未满 14 岁',
  RELIGION:             '宗教信仰',
  SEXUAL_ORIENTATION:   '性取向',
  UNDISCLOSED_CRIMINAL: '未公开犯罪',
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING:       { label: '待审',     cls: 'chip-amber' },
  PARTIAL:       { label: '部分合规', cls: 'chip-amber' },
  COMPLIANT:     { label: '合规',     cls: 'chip-green' },
  NON_COMPLIANT: { label: '不合规',   cls: 'chip-red' },
};

export default async function DataItemsPage({ params }: { params: { id: string } }) {
  const project = await db.piaProject.findUnique({ where: { id: params.id } });
  if (!project) notFound();
  const L = labelsFor(project.assessmentType);

  const items = await db.dataItem.findMany({
    where: { projectId: project.id },
    orderBy: { code: 'asc' },
    include: { scenarios: { select: { code: true } } },
  });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: '评估', href: '/projects' },
        { label: project.code, href: `/projects/${project.id}` },
        { label: '信息项' },
      ]} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">{project.code} · 03 信息项映射 · GB/T 39335 §7.1</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">{L.dataItem.plural}清单</h1>
          <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-slate-500">
            按 PIPL §13/14 + GB/T 35273 4.5 对每个信息项做分类(一般/敏感)+ 合法性基础论证 + 必要性论证 + 主体权益影响分析。
          </p>
        </div>
        <Link href={`/projects/${project.id}/data-items/new`} className="btn-primary whitespace-nowrap">
          + 新增{L.dataItem.singular}
        </Link>
      </div>

      <div className="card-soft overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50/60 text-left text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-3">编号</th>
              <th className="px-3 py-3">字段 / 三性论证摘要</th>
              <th className="px-3 py-3">分类</th>
              <th className="px-3 py-3">敏感子类</th>
              <th className="px-3 py-3">合法性基础<br/><span className="font-normal normal-case text-slate-400">PIPL §13/14</span></th>
              <th className="px-3 py-3 text-center">出境</th>
              <th className="px-3 py-3">现状</th>
              <th className="px-3 py-3">关联场景</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => {
              const c = CLASS_LABEL[d.classification];
              const lb = d.legalBasis ? LEGAL_BASIS_LABEL[d.legalBasis] : null;
              const st = STATUS_LABEL[d.status];
              return (
                <tr key={d.id} className="border-t border-slate-100 align-top hover:bg-blue-50/30">
                  <td className="px-3 py-3 font-mono text-[11px] text-slate-500">{d.code}</td>
                  <td className="px-3 py-3 max-w-[420px]">
                    <p className="text-[13px] font-semibold text-slate-900">{d.name}</p>
                    {d.techName && <p className="font-mono text-[10px] text-slate-400">{d.techName}</p>}
                    {d.legalReasoning && (
                      <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-500">{d.legalReasoning}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={c?.cls ?? 'chip'}>{c?.label ?? d.classification}</span>
                  </td>
                  <td className="px-3 py-3 text-[11px]">
                    {d.sensitiveSub.length > 0
                      ? d.sensitiveSub.map((s) => SENSITIVE_SUB_LABEL[s] ?? s).join(' · ')
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {lb ? (
                      <div>
                        <span className={lb.cls}>{lb.label}</span>
                        {lb.ref && <p className="mt-1 font-mono text-[9px] text-slate-400">{lb.ref}</p>}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {d.isOutbound ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">✓</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={st?.cls ?? 'chip'}>{st?.label ?? d.status}</span>
                  </td>
                  <td className="px-3 py-3 text-[11px] text-slate-500">
                    {d.scenarios.map((s) => s.code).join(' · ') || <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
