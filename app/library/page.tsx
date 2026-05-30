const LAWS = [
  {
    code: 'PIPL §55',
    title: '应当进行个人信息保护影响评估的五类情形',
    body: '处理敏感个人信息；利用个人信息进行自动化决策；委托处理 / 共享 / 公开个人信息；向境外提供个人信息；其他对个人权益有重大影响的处理活动。',
  },
  {
    code: 'PIPL §56',
    title: 'PIA 必含内容 + 留痕 ≥ 3 年',
    body: '处理目的、方式等是否合法、正当、必要；对个人权益的影响及安全风险；所采取的保护措施是否合法、有效并与风险程度相适应。报告和处理情况记录应当至少保存三年。',
  },
  {
    code: '评估办法 §5',
    title: '数据出境安全自评估必备内容',
    body: '数据出境的合法性、正当性、必要性；境外接收方所在国家或地区的数据安全保护政策法规和网络安全环境；数据出境的规模、范围、种类、敏感程度，可能对国家安全、公共利益、个人或组织合法权益的风险等。',
  },
  {
    code: 'PIPL §28',
    title: '敏感个人信息定义',
    body: '一旦泄露或者非法使用，容易导致自然人的人格尊严受到侵害或者人身、财产安全受到危害的个人信息，包括生物识别、宗教信仰、特定身份、医疗健康、金融账户、行踪轨迹等信息，以及不满十四周岁未成年人的个人信息。',
  },
  {
    code: 'PIPL §39',
    title: '向境外提供个人信息的告知 + 单独同意',
    body: '应当向个人告知境外接收方的名称或者姓名、联系方式、处理目的、处理方式、个人信息的种类以及个人向境外接收方行使本法规定权利的方式和程序等事项，并取得个人的单独同意。',
  },
  {
    code: 'GB/T 39335-2020',
    title: '信息安全技术 个人信息安全影响评估指南',
    body: '国家标准 · PIA 方法论。包含评估范围确定、风险识别、风险分析评价、报告编写四个步骤。本系统的字段设计与此对齐。',
  },
  {
    code: 'GB/T 35273-2020',
    title: '信息安全技术 个人信息安全规范',
    body: '4.5 节明确列举敏感个人信息子类型，含生物识别信息（4.5b）。本系统的「敏感子类型」枚举来源。',
  },
  {
    code: 'GB/T 45574-2025',
    title: '数据安全技术 敏感个人信息处理安全要求',
    body: '2025 年新国标，对敏感 PI 处理规则、技术要求、生物识别构成要件做出进一步细化。',
  },
];

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">合规法规库</h1>
        <p className="mt-1 text-sm text-muted-foreground">本系统所依据的法规条款速查。PIA 中的「评估依据」「定性依据」字段会引用这些条款。</p>
      </div>

      <div className="space-y-3">
        {LAWS.map((l) => (
          <article key={l.code} className="rounded-xl border bg-white p-5">
            <header className="flex items-baseline gap-3">
              <span className="rounded bg-violet-100 px-2 py-0.5 font-mono text-xs text-violet-700">{l.code}</span>
              <h3 className="text-base font-medium">{l.title}</h3>
            </header>
            <p className="mt-2 text-sm text-muted-foreground">{l.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
