type DashStats = {
  totalRisks: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalMitigations: number;
  acceptableCount: number;
  conditionalCount: number;
  unacceptableCount: number;
  dataItems: number;
  scenarios: number;
  roles: number;
  residualLevel: string;
};

const LEVEL_LABEL: Record<string, { label: string; cls: string; desc: string }> = {
  UNRATED: { label: '未评定', cls: 'bg-slate-100 text-slate-600', desc: '尚未完成风险综合分析' },
  LOW: { label: '低', cls: 'bg-emerald-100 text-emerald-700', desc: '可接受 · 常规复评' },
  MEDIUM: { label: '中', cls: 'bg-amber-100 text-amber-700', desc: '可控 · 措施跟进监控' },
  HIGH: { label: '高', cls: 'bg-red-100 text-red-700', desc: '需立即处置' },
};

export default function ProjectDashboard({ stats }: { stats: DashStats }) {
  const meta = LEVEL_LABEL[stats.residualLevel] ?? LEVEL_LABEL.UNRATED;
  const mitProgress = stats.totalRisks > 0 ? Math.round((stats.totalMitigations / stats.totalRisks) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <BigStat
        label="整体残余风险"
        value={meta.label}
        valueClass={`text-[28px] font-bold ${meta.cls.split(' ')[1]}`}
        sub={meta.desc}
        accent={meta.cls}
        full
      />
      <Stat
        label="风险总数"
        value={stats.totalRisks}
        sub={
          <span className="flex gap-2 text-[10px]">
            <span className="chip-red">高 {stats.highCount}</span>
            <span className="chip-amber">中 {stats.mediumCount}</span>
            <span className="chip-green">低 {stats.lowCount}</span>
          </span>
        }
      />
      <Stat
        label="措施数 · 覆盖率"
        value={`${stats.totalMitigations} · ${mitProgress}%`}
        sub={
          <span className="flex gap-2 text-[10px]">
            <span className="chip-green">{stats.acceptableCount} 可接受</span>
            <span className="chip-amber">{stats.conditionalCount} 条件</span>
            {stats.unacceptableCount > 0 && <span className="chip-red">{stats.unacceptableCount} 不可</span>}
          </span>
        }
      />
      <Stat label="信息项 / 场景 / 角色" value={`${stats.dataItems} / ${stats.scenarios} / ${stats.roles}`} sub="结构完整度" />
    </div>
  );
}

function BigStat({ label, value, valueClass, sub, accent, full }: any) {
  return (
    <div className={`card-soft p-5 ${full ? 'md:col-span-1' : ''}`}>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 inline-block rounded-lg px-3 py-1 ${accent} ${valueClass}`}>{value}</p>
      <p className="mt-2 text-[11px] text-slate-500">{sub}</p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: any; sub: any }) {
  return (
    <div className="card-soft p-5">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-[22px] font-bold tabular-nums text-slate-900">{value}</p>
      <div className="mt-2">{sub}</div>
    </div>
  );
}
