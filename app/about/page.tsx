export default function AboutPage() {
  return (
    <div className="prose prose-sm max-w-3xl">
      <h1>关于 PIA Forge</h1>
      <p className="text-base">
        PIA Forge 是<strong>合规人自己的开放数据中台</strong>。
        让每个合规人的 Agent 都能往里写、能从里读，把零散的合规判断沉淀为可签字、可审计、可复评的结构化资产。
      </p>

      <h2>为什么不一样</h2>
      <p>市面上的合规工具有两类：</p>
      <ul>
        <li><strong>律所定制 Word 模板</strong>：一次性交付，半年后没人维护</li>
        <li><strong>巨头一站式合规 SaaS</strong>：自带 LLM、自带流程、数据出不了它的栈</li>
      </ul>
      <p>
        PIA Forge 走第三条路：<strong>做底座，不抢 Agent</strong>。
        每个合规人已经有自己的 Claude Code / Cursor / 自建 Agent，PIA Forge 不再给一个。
        它只做一件事 —— 把 Agent 干出来的零散合规判断变成结构化资产。
      </p>

      <h2>五个 Module · 一个底座</h2>
      <table>
        <thead><tr><th>Module</th><th>v</th><th>适用</th></tr></thead>
        <tbody>
          <tr><td><strong>PIA</strong> 个人信息保护影响评估</td><td>v0.1 ✅</td><td>PIPL §55-56 / 数据出境 / 敏感 PI 处理</td></tr>
          <tr><td><strong>AUDIT</strong> 合规审计</td><td>v0.2 📋</td><td>内审 / 子公司审计 / 监管审计</td></tr>
          <tr><td><strong>FILING</strong> 申报与备案</td><td>v0.3 📋</td><td>数据出境申报 / 承诺函台账</td></tr>
          <tr><td><strong>NOTICE</strong> 告知与同意</td><td>v0.4 📋</td><td>隐私政策 / 弹窗版本</td></tr>
          <tr><td><strong>INCIDENT</strong> 事件响应</td><td>v0.5 📋</td><td>数据事件 / 客诉 / 反诈线索</td></tr>
        </tbody>
      </table>

      <h2>三层开放接口</h2>
      <ol>
        <li><strong>Skill Pack</strong> — 挂到 Agent 上就懂怎么用 PIA Forge</li>
        <li><strong>MCP Server</strong> — LLM Agent 的原生协议</li>
        <li><strong>REST API v1</strong> — 朴素 HTTP + Bearer Token，任何东西都能调</li>
      </ol>

      <h2>设计原则</h2>
      <ol>
        <li><strong>不自带 LLM</strong> —— 合规人已经有自己的 Agent</li>
        <li><strong>定性争议留痕</strong> —— 「人脸照片是否生物识别」这种 case，结论本身不重要，裁决依据和适用边界要永久可查</li>
        <li><strong>角色边界硬约束</strong> —— 法务给合法性意见、不当事实定性裁判</li>
        <li><strong>风险量化 + 残余风险闭环</strong> —— 措施落地后必须重新评级</li>
        <li><strong>复评是默认状态</strong> —— PIA 不是签字归档就完，绑定 7 类触发条件 + 12 个月强制周期</li>
        <li><strong>Agent 是协作者 · 不是裁判</strong> —— Agent 可以起草，但签字必须由人在网页完成</li>
      </ol>

      <h2>License</h2>
      <p>MIT License · 商用免费、修改免费、二次分发免费，仅要求保留 copyright 声明。</p>
    </div>
  );
}
