---
name: legal-ingest
description: 看到新法规 / 国标 / 监管文件时,Agent 自动爬取原文 + 入 PIA Forge 公共知识库(scope=ORG)。让法规库不再是空架子。
triggers:
  - 入库这条法规
  - 把这份国标爬下来
  - 新法规入库
  - 新规扫一遍
  - legal-ingest
  - 把这份监管文件入库
version: 0.1.0
---

# legal-ingest Skill

当用户提到一份新法规 / 国标 / 监管办法时,Agent 负责:
1. 爬取原文(网页 / PDF / 飞书消息)
2. 整理成 markdown
3. 通过 PIA Forge MCP 工具 `create_source` 写入公共知识库(scope=ORG)

## 何时触发

- 用户贴了一个法规链接(gov.cn / cac.gov.cn / openstd.samr.gov.cn / mps.gov.cn 等)
- 用户在飞书消息里转发了一段新规摘要
- 用户说「这份新出的 xxx 法,帮我入库」「跑一遍最近的 xx 法规」
- 自动巡检模式: 定时从订阅源(RSS / 公众号镜像)抓取新规

## 环境要求

- 已配置 PIA Forge MCP server (见 `~/.config/claude/mcp.json`)
- 已在 PIA Forge 创建 `legal-ingest` 专用 Agent + ApiToken
- 已配置 WebFetch 或浏览器抓取能力

## 工作流

### Step 1 · 确认目标知识库(KnowledgeBase)

调 MCP `list_knowledge_bases({ scope: "ORG" })` 拿到现有的公共 KB 列表。

常见的 4 类公共 KB:
- `PIPL · 个人信息保护法 · 官方公报` (uri: gov.cn)
- `国家标准 · GB/T 系列` (uri: openstd.samr.gov.cn)
- `数据出境安全评估办法 + 配套规则` (uri: cac.gov.cn)
- 用户自定义新增的(比如「网安法」「数安法」)

如果目标 KB 不存在,先创建一个(需要用户拍 KB 的来源域名)。

### Step 2 · 抓取原文

根据 URL 类型选抓取方式:

| 来源 | 方式 | 说明 |
|------|------|------|
| gov.cn / cac.gov.cn | WebFetch + 提取主体 | HTML 转 markdown |
| openstd.samr.gov.cn | 国标全文公开系统 | 部分可看 / 部分要付费,付费的留指针 |
| 飞书消息 / 公众号转发 | 直接 markdown 化 | 留来源链接 |
| PDF | 用户上传 + OCR/解析 | 转 markdown |

**❗ 永远保留稳定 uri** — 即使原文 URL 后续失效,通过 uri + capturedAt 也能定位历史快照。

### Step 3 · 整理成结构化 markdown

格式约定(便于后续 Agent 阅读 + 检索):

```markdown
# 法规简称 §条款号 · 条款主题

## 主体

(原文 · 一字不改)

## 实务影响(可选 · 简短)

- 影响场景 1
- 影响场景 2

---

> 版本: 2021-11-01 施行 · 来源: 国务院公报 · 抓取时间: 2026-05-31
```

**严禁** 在「主体」里掺入解读 — 解读是 `legal-review` skill 的活,放到私人知识库。

### Step 4 · 调 create_source 入库

```javascript
mcp.tools.create_source({
  knowledgeBaseId: "<目标 KB 的 id>",
  type: "URL",                                  // 或 GITHUB_FILE / FEISHU_DOC
  uri: "https://www.gov.cn/xxx#§28",            // 含锚点
  title: "PIPL §28 · 敏感个人信息定义",
  body: "<markdown 全文>",
  excerpt: "<一句话摘要,显示在列表里>",
  tags: ["§28", "敏感个人信息", "生物识别"],     // 便于检索
  scope: "ORG"                                  // 公共
});
```

写完后给用户一句反馈: 「✅ 已入库 [§28 敏感个人信息定义] · 可在 /library?tab=laws 查看」

### Step 5(可选)· 触发 legal-review

如果用户说「顺便帮我做下解读」,直接交接给 `legal-review` skill。否则不主动越界。

## 边界(不许做)

- ❌ 不要在 body 里写「我的解读」/「我的判断」— 那是 legal-review 的活,放私人 KB
- ❌ 不要写入 PRIVATE scope — 公共法规必须 scope=ORG,所有 Agent / 用户共享
- ❌ 不要修改已有 Source 的 body — 法规如果改版,创建新 Source 用新 uri(带新版本号),老 Source 保留作为历史
- ❌ 不要爬付费国标的全文 — 标识为「需购买」+ 留指针
- ❌ 不要在 PIA Forge 数据库里"造"内容 — 真正爬到了才入库,不要编

## 自检清单(写完一次入库后回看)

- [ ] uri 是稳定标识(含锚点 / commit sha / 版本号)
- [ ] body 是原文 · 不掺解读
- [ ] tags 至少 3 个 · 包含条款号 + 主题词
- [ ] excerpt < 80 字 · 是该条最核心的一句话
- [ ] scope = ORG
- [ ] knowledgeBaseId 选对了(PIPL 进 PIPL · 国标进 GB/T)

## 后续:用户怎么用这条入库内容

1. 用户在 PIA Forge UI `/library?tab=laws` 看到这条 + 渲染预览
2. 其他 Agent 评估时通过 `list_sources({ q: "§28" })` 检索到
3. 评估写 Risk 时通过 citations payload 引用本条
4. 未来引用关系自动维护
