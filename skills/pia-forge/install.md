# 安装 PIA Forge Skill 到你的 Agent

> 这份 Skill 让你的 Claude Code / Cursor / 其他 Agent 学会和 PIA Forge 系统协作。

## 1 · 准备工作

确认你有：
- 一个 PIA Forge 实例（可以是你自己阿里云部署的，也可以是云端 demo）
- 一个 API Token（在 PIA Forge 「设置 → API Tokens」 创建）

## 2 · 给 Claude Code 安装

```bash
# 进入你的 Claude Code skills 目录
cd ~/.claude/skills/

# 拉取本 skill
git clone --depth=1 \
  https://github.com/juejiangxiaopianzi/pia-forge.git pia-forge-repo

# 移动 skill 部分
mv pia-forge-repo/skills/pia-forge ./pia-forge
rm -rf pia-forge-repo

# 重启 Claude Code 让它发现新 skill
```

然后在 Claude Code 里挂上 PIA Forge 的 MCP server：

```bash
claude mcp add pia-forge \
  --url https://your-pia-forge-server.com/api/mcp \
  --header "Authorization: Bearer pia_xxxxxxxx.xxxxxxxxxxxxxxxx"
```

验证：

```
你的 Agent：
> 列出我所有的 PIA 评估项目
```

如果你看到项目列表，就装好了。

## 3 · 给 Cursor 安装

Cursor 还不支持文件式 skill，但可以把 SKILL.md 内容做成 Rules：

1. `Settings → Rules → Add New Rule`
2. 把 `SKILL.md` 整段贴进去
3. 设置 trigger：「mentioning PIA Forge or 合规评估」

然后配置 MCP：`Settings → Features → MCP → Add Server`。

## 4 · 给自建 Agent 安装

直接把 `SKILL.md` 作为 system prompt 的一部分，配上 MCP / REST API 调用能力。

## 5 · 检查清单

- [ ] Skill 已放进 `~/.claude/skills/pia-forge/`
- [ ] MCP server 已挂上，curl 测试通了
- [ ] Token 至少有 `ADMIN` scope（或细粒度按需）
- [ ] Agent 重启后能看到 `pia-forge` 这个 skill 在列表里
- [ ] 跑一句「列出我的项目」能拿到结果

## 6 · 卸载

```bash
rm -rf ~/.claude/skills/pia-forge
claude mcp remove pia-forge
```

PIA Forge 服务端的 Token 也建议在控制台手动吊销。
