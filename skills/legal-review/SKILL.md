---
name: legal-review
description: 对法规/案例/客户沟通做用户视角的解读 · 写到用户的 GitHub Private 知识库 · 同时在 PIA Forge 建索引让评估时能引用。这是用户「私有合规判断口径」的物化。
triggers:
  - 帮我解读 PIPL §28
  - 这条法规公司怎么落
  - 我对 xx 的判断口径
  - 客户主张 xxx,你帮我写一份判定
  - legal-review
  - 把这次和客户的沟通沉淀成口径
version: 0.1.0
---

# legal-review Skill

把法规、案例、客户沟通转化为**用户视角的解读**,沉淀到用户私有的 GitHub Private 知识库,再在 PIA Forge 里建索引让评估时能引用。

> ⚠️ 这个 skill 极度个人化 — 同一条 PIPL §28,黄越的解读 ≠ 张三的解读,做出来的 PIA 结论也会不一样。本 skill 模板**只给框架**,每个用户需要自己调教里面的判断口径。

## 何时触发

- 用户读了一条新法规,问「你怎么看 / 公司怎么落 / 边界在哪」
- 客户来争议,需要写一份判定 / 反驳论点
- 看完一个案例(同行被罚 / 监管处罚),用户要总结启示
- 用户想把零散的口径系统化

## 环境要求

- 已配置 PIA Forge MCP server
- 用户的 GitHub Private repo 已建(本模板默认 `<username>/<compliance>-kb`,如 `juejiangxiaopianzi/huangyue-compliance-kb`)
- Agent 有该 repo 的 push 权限(GitHub PAT / SSH key)
- 已安装 `legal-ingest` skill(本 skill 经常引用原文)

## 工作流

### Step 1 · 拉相关法规原文

先调 PIA Forge MCP `list_sources({ q: "<关键词>", scope: "ORG" })`,拿到所有相关公共法规条款。

如果发现某个关键法规还没入库,先调 `legal-ingest` skill 把它爬入库 — 否则解读时引用空气。

### Step 2 · 写解读(结构化模板)

按以下模板生成 markdown,**写到用户的 GitHub Private repo**:

```
<repo>/interpretations/<法规简称>/<条款号或主题>.md
```

例如: `huangyue-compliance-kb/interpretations/pipl/§28-照片是否构成生物识别.md`

模板:

```markdown
# 我对 <法规> 的统一口径 · <具体主题>

## 结论

(一句话: 在 XX 条件下 / XX 处理方式下,我的判断是 ZZ)

## 法定要件三段论

1. <上位法依据> — 引用 PIPL §xx
2. <国标 / 标准> — 引用 GB/T xxx
3. <监管解读 / 行业惯例> — 引用 xxx

## 公司当前实施口径

| 字段 / 场景 | 用途 | 是否触发 | 应采取的措施 |
|------------|------|---------|------------|
| ...        | ...  | ✅/❌    | ...        |

## 反方论点 + 我方驳论(留底)

- 反方: <对方主张>
- 我方: <驳论 · 引用国标 / 监管 / 已生效判例>

## 触发本判断的具体 case

- 时间: 2026-05-26
- 场景: <谁 / 什么场景下提出>
- 链接: <飞书纪要 / 邮件 / 工单 link>

---

> 解读者: <用户名> · 最后更新: <date> · 引用源: <PIPL §xx / GB/T xxx / xx 飞书纪要>
> 重要变更: 本文档随用户判断口径变化更新 · git history 是版本依据
```

### Step 3 · push 到 GitHub Private repo

```bash
cd ~/<repo>
git pull --rebase
mkdir -p interpretations/<法规简称>
# 写文件
git add interpretations/<法规简称>/<主题>.md
git commit -m "interpretation: <法规> <主题> v1"
git push
# 记下 commit sha,下一步要用
COMMIT_SHA=$(git rev-parse HEAD | head -c 7)
```

### Step 4 · 在 PIA Forge 建索引(create_source)

把刚 push 的 markdown 文件作为 Source 写入 PIA Forge,scope=PRIVATE,关联到用户的 GitHub 私有 KB:

```javascript
mcp.tools.create_source({
  knowledgeBaseId: "<用户私有 KB 的 id · 即 GITHUB_REPO 那个>",
  type: "GITHUB_FILE",
  uri: `github://<owner>/<repo>/interpretations/<法规简称>/<主题>.md@${COMMIT_SHA}`,
  title: "【我的解读】<法规> · <主题>",
  body: "<markdown 全文 · 同 GitHub 文件内容>",       // 缓存一份用于 PIA Forge 内预览
  excerpt: "<一句话: 我的结论>",
  tags: ["解读", "<法规>", "<具体主题>"],
  scope: "PRIVATE"
});
```

**关键: uri 必须绑 commit SHA** — 这样未来该文件被改了,引用还能拿到当初的版本。

写完后反馈: 「✅ 解读已 push 到 `<repo>/interpretations/<法规简称>/<主题>.md` · PIA Forge 已索引,可在 /library?tab=private 查看」

### Step 5(可选)· 建知识索引让其他 Agent 找得到

如果这条解读会被反复引用,调 `create_knowledge_index`(待实现)或在 PIA Forge UI 手动加一条主题索引,指向本 Source。

## 边界(不许做)

- ❌ 不要把别人(其他用户)的解读拉到本用户的私有 KB
- ❌ 不要在公共法规库(scope=ORG)里写解读 — 那里只放原文
- ❌ 不要修改用户已有的解读 — 如果用户判断口径变了,git commit 一个新版本,原版作为 git history 留底
- ❌ 不要在解读里编造没发生过的 case — 「触发本判断的具体 case」必须真实
- ❌ 不要假装代表"行业共识" — 这是**用户个人的口径**,不是行业标准

## 写解读的几条铁律(给 Agent · 学习用户的判断风格)

1. **结论先行** — 第一句话就说判断,不要绕
2. **三段论引用** — 上位法 + 国标 + 监管,缺一不可
3. **必须列实施表格** — 抽象口径要落到具体字段 / 场景
4. **留底反方论点** — 同一件事别人怎么看,你怎么驳,都记下来
5. **case 触发** — 这个解读为什么会产生,是什么 case 逼出来的

## 自检清单(写完一次解读)

- [ ] 结论在第一段
- [ ] 至少引用了 1 个 ORG scope 的法规 Source(从 PIA Forge 拉的)
- [ ] 实施口径表格有具体字段 / 场景
- [ ] 反方论点 + 驳论留底
- [ ] git push 成功 + commit SHA 已绑到 PIA Forge Source.uri
- [ ] PIA Forge UI `/library?tab=private` 能看到 + 预览
