export default function AboutPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">关于</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">PIA Forge</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
          PIA Forge 是<strong className="text-slate-900">合规人自己的开放数据中台</strong>。
          让每个合规人的 Agent 都能往里写、能从里读,把零散的合规判断沉淀为可签字、可审计、可复评的结构化资产。
        </p>
      </header>

      <Section title="为什么不一样">
        <p>市面上的合规工具有两类:</p>
        <ul className="mt-2 space-y-2">
          <Item label="律所定制 Word 模板" body="一次性交付,半年后没人维护" />
          <Item label="巨头一站式合规 SaaS" body="自带 LLM、自带流程,数据出不了它的栈" />
        </ul>
        <p className="mt-4">
          PIA Forge 走第三条路:<strong>做底座,不抢 Agent</strong>。
          每个合规人已经有自己的 Claude Code / Cursor / 自建 Agent,PIA Forge 不再给一个。
          它只做一件事 —— 把 Agent 干出来的零散合规判断,变成结构化资产。
        </p>
      </Section>

      <Section title="5 个 Module · 一个底座">
        <div className="card-soft overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50/50 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Module</th>
                <th className="px-4 py-3 font-medium">版本</th>
                <th className="px-4 py-3 font-medium">适用</th>
              </tr>
            </thead>
            <tbody>
              <Row name="PIA · 个人信息保护影响评估" version="v0.1 ✓" scope="PIPL §55-56 / 数据出境 / 敏感 PI 处理" />
              <Row name="AUDIT · 合规审计" version="v0.2" scope="内审 / 子公司审计 / 监管审计" />
              <Row name="FILING · 申报与备案" version="v0.3" scope="数据出境申报 / 承诺函台账" />
              <Row name="NOTICE · 告知与同意" version="v0.4" scope="隐私政策 / 弹窗版本" />
              <Row name="INCIDENT · 事件响应" version="v0.5" scope="数据事件 / 客诉 / 反诈线索" />
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="三层开放接口">
        <ol className="mt-2 space-y-2">
          <ItemNumbered no={1} body={<><strong>Skill Pack</strong> —— 挂到 Agent 上就懂怎么用 PIA Forge</>} />
          <ItemNumbered no={2} body={<><strong>MCP Server</strong> —— LLM Agent 的原生协议</>} />
          <ItemNumbered no={3} body={<><strong>REST API v1</strong> —— 朴素 HTTP + Bearer Token,任何东西都能调</>} />
        </ol>
      </Section>

      <Section title="设计原则">
        <ol className="space-y-3">
          <Principle title="不自带 LLM" body="合规人已经有自己的 Agent" />
          <Principle title="定性争议留痕" body="「人脸照片是否生物识别」这种 case,结论本身不重要,裁决依据和适用边界要永久可查" />
          <Principle title="角色边界硬约束" body="法务给合法性意见,不当事实定性裁判" />
          <Principle title="风险量化 + 残余风险闭环" body="措施落地后必须重新评级" />
          <Principle title="复评是默认状态" body="PIA 不是签字归档就完,绑定 7 类触发条件 + 12 个月强制周期" />
          <Principle title="Agent 是协作者,不是裁判" body="Agent 可以起草,但签字必须由人在网页完成" />
        </ol>
      </Section>

      <Section title="License">
        <p className="text-[13px] text-slate-600">
          MIT License · 商用免费、修改免费、二次分发免费,仅要求保留 copyright 声明。
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">{title}</h2>
      <div className="mt-3 text-[13.5px] leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

function Item({ label, body }: { label: string; body: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-slate-400" />
      <div><strong className="text-slate-900">{label}</strong>:{body}</div>
    </li>
  );
}

function ItemNumbered({ no, body }: { no: number; body: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 font-mono text-[10px] font-semibold text-blue-600">{no}</span>
      <div className="text-slate-700">{body}</div>
    </li>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
      <div>
        <strong className="text-slate-900">{title}</strong> ·{' '}
        <span className="text-slate-600">{body}</span>
      </div>
    </li>
  );
}

function Row({ name, version, scope }: { name: string; version: string; scope: string }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3 font-medium text-slate-900">{name}</td>
      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{version}</td>
      <td className="px-4 py-3 text-slate-500">{scope}</td>
    </tr>
  );
}
