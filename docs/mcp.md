# MCP 接入指南

PIA Forge 内置 MCP（Model Context Protocol）Server，让你的 Agent（Claude Code / Cursor / Claude Desktop / 自建 Agent）能直接读写 PIA Forge 的数据。

## 1 · 在 PIA Forge 控制台生成 Token

1. 登录 PIA Forge
2. 进 `设置 → API Tokens`
3. 点「新建 Token」
4. 填备注（例如「我的 Claude Code」）→ 选 scopes（默认 `ADMIN`）→ 创建
5. **复制 token 字符串，仅显示一次**（格式：`pia_xxxxxxxx.xxxxxxxxxxxxxxxx`）

## 2 · 在 Agent 端配置

### Claude Desktop（macOS / Windows）

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "pia-forge": {
      "url": "https://your-pia-forge-server.com/api/mcp",
      "headers": {
        "Authorization": "Bearer pia_xxxxxxxx.xxxxxxxxxxxxxxxx",
        "X-Agent-Name": "claude-desktop"
      }
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add pia-forge \
  --url https://your-pia-forge-server.com/api/mcp \
  --header "Authorization: Bearer pia_xxxxxxxx.xxxxxxxxxxxxxxxx"
```

### Cursor

`Settings → Features → Model Context Protocol → Add Server`

填入 URL 和 Headers 同上。

### 自建 Agent / 任何 MCP-compatible client

只要支持 MCP Streamable HTTP / JSON-RPC 2.0，都能接。

## 3 · 验证

在 Agent 里问一句「列出我所有的 PIA 评估项目」，Agent 应该会调用 `list_projects` tool 并返回结果。

## 4 · 可用 Tools

| Tool | 作用 |
|------|------|
| `list_projects` | 列出全部评估项目（可按 module 类型过滤） |
| `create_project` | 创建新评估（PIA / AUDIT / FILING / NOTICE / INCIDENT） |
| `get_project` | 获取项目详情 |
| `list_risks` | 列出某项目下全部风险（含 riskValue/riskLevel） |
| `create_risk` | 创建风险（可能性×严重度自动算等级） |
| `create_mitigation` | 添加控制措施（含残余风险） |
| `create_data_item` | 创建信息项 / 控制项 |
| `submit_conclusion` | 提交评估结论 |
| `generate_report` | 生成评估报告（Markdown / JSON） |

## 5 · 可用 Resources

Agent 可以通过 `resources/read` 读取这些只读知识库：

| URI | 内容 |
|-----|------|
| `pia-forge://legal/pipl` | PIPL 关键条款（§17 §28 §38-43 §55-56） |
| `pia-forge://legal/gb-39335` | GB/T 39335-2020 PIA 方法论 |
| `pia-forge://legal/gb-45574` | GB/T 45574-2025 敏感 PI 处理要求 |
| `pia-forge://taxonomy/risk-category` | 风险类别词典 |
| `pia-forge://template/raci` | RACI 角色模板 |

## 6 · 留痕

每次 Agent 通过 MCP 调用 tools，都会在 `AuditLog` 表里记一条：
- `source = MCP`
- `agentName` = Agent 通过 `X-Agent-Name` header 自报的名字
- `userId` = Token 所属用户
- `diff` = 字段变更详情

在 PIA Forge 控制台的「审计留痕」页可以看到 Agent 干了什么。

## 7 · 用 curl 探活

```bash
# 元信息
curl https://your-pia-forge-server.com/api/mcp \
  -H "Authorization: Bearer pia_xxxx.xxxx"

# JSON-RPC initialize
curl -X POST https://your-pia-forge-server.com/api/mcp \
  -H "Authorization: Bearer pia_xxxx.xxxx" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'

# 列项目
curl -X POST https://your-pia-forge-server.com/api/mcp \
  -H "Authorization: Bearer pia_xxxx.xxxx" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_projects","arguments":{}}}'
```
