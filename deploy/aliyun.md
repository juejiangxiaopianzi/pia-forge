# 阿里云部署指南（傻瓜版）

> 目标：让非技术背景的合规人 / 律师 / 产品负责人，**只买两样东西** + **跑五条命令**，就能把 PIA Forge 跑在自己的阿里云账号下。
>
> PIA Forge 不调 LLM，不联外网（除了下载依赖），数据完全在你的服务器和数据库里。

---

## 🛒 购物清单（只买这两样）

### 1. 阿里云轻量应用服务器（ECS Lite）

> **作用**：跑 PIA Forge 网站本身。

| 项目 | 推荐配置 | 原因 | 预估月费 |
|------|----------|------|----------|
| 区域 | **杭州 / 上海**（华东任意一个） | 跟你常用的飞书在一个区，体验最稳 | — |
| 规格 | **2核 2GB 内存 · 50GB SSD · 3M 带宽** | Next.js + Postgres client 的最低跑得动的规格 | ¥45-60 / 月 |
| 镜像 | **Docker CE**（应用镜像里搜 Docker） | 装好了 Docker，省一步 | — |
| 操作系统 | Ubuntu 22.04 / 24.04 LTS | 跟 Docker 镜像最佳搭配 | — |
| 备份 | 开启「7 天自动快照」 | 误删/被攻击有救 | 免费送 |

🔗 购买入口：https://www.aliyun.com/product/swas

### 2. 阿里云 RDS PostgreSQL

> **作用**：存所有 PIA 数据（评估项目 / 信息项 / 风险 / 措施 / 签字记录 / 审计留痕）。**全托管** = 自动备份、自动安全补丁、不用你操心。

| 项目 | 推荐配置 | 原因 | 预估月费 |
|------|----------|------|----------|
| 区域 | **跟轻量服务器同区域**（杭州或上海） | 内网互通，免外网流量费 | — |
| 引擎 | **PostgreSQL 16**（最低 14） | PIA Forge 用的 ORM 是 Prisma + Postgres | — |
| 规格 | **基础版 2核 4GB · 20GB SSD** | 起步够用，后期可弹性升级 | ¥125-160 / 月 |
| 类型 | 基础版（单可用区） | 个人/小团队用基础版即可；正式生产再升高可用 | — |
| 网络 | **专有网络 VPC**（跟服务器同 VPC） | 内网直连最快最便宜 | — |
| 白名单 | 加入轻量服务器的内网 IP | 默认拒绝所有，必须显式加 | — |

🔗 购买入口：https://www.aliyun.com/product/rds/postgresql

### 3. 可选 · 阿里云 OSS（对象存储）

> **作用**：存附件证据（电子签证书、整改截图、监管回函）。**按用量付费 · 不传文件不收费**。

- 标准存储 ¥0.12/GB/月，前 5GB 内总成本几乎为零。
- 开通入口：https://www.aliyun.com/product/oss
- 建一个 Bucket 叫 `pia-forge-attachments`，私有读写。

### 4. 可选 · 域名 + ICP 备案

> 如果只是你自己用 + 团队 5 人内，**用服务器公网 IP 就行**，不需要域名。
> 如果要长期对外提供服务 / 给客户演示 / 想上 HTTPS，再买域名走备案。

- 域名：阿里云万网，`.com` ¥55/年起。
- 备案：免费但要 7-20 个工作日（拍照、签字、运营商配合）。

---

## 💰 月成本汇总

| 用法 | 预估月费 |
|------|----------|
| 最简（轻量服务器 + RDS） | **约 ¥170-220 / 月** |
| 加 OSS（轻度用） | + ¥1-5 |
| 加域名（年付） | + ¥5（55/12） |
| 总计 | **¥180-230 / 月** |

新用户首单优惠 + 年付折扣，第一年可降到 ¥100/月 以内。

---

## ⚙️ 部署步骤（5 步，预计 30 分钟）

### Step 1 · 买完上面两样，记下三个东西

1. **轻量服务器的公网 IP**（在控制台首页能看到）
2. **RDS 的内网连接地址 + 端口**（5432）
3. **RDS 给你设置的数据库用户名、密码、数据库名**（建数据库时填的）

### Step 2 · 给 RDS 加白名单 + 创建数据库

1. 进 RDS 控制台 → **数据安全性 → 白名单设置** → 把轻量服务器的**内网 IP** 加进去（注意不是公网 IP）。
2. **账号管理 → 创建账号**：用户名 `pia`，密码自己设。
3. **数据库管理 → 创建数据库**：库名 `pia_forge`，授权给上面的 `pia` 账号。

### Step 3 · 登入轻量服务器

阿里云控制台直接有「远程连接」按钮，浏览器里就能开终端，不需要任何 SSH 工具。

### Step 4 · 跑这一段命令

```bash
# 1. 装 git（如果镜像没预装）
apt update && apt install -y git

# 2. 拉代码
cd /opt
git clone https://github.com/juejiangxiaopianzi/pia-forge.git
cd pia-forge

# 3. 写环境变量
cp .env.example .env
nano .env
# 必填：
#   DATABASE_URL=postgresql://pia:你的密码@rds内网地址:5432/pia_forge?schema=public
#   NEXTAUTH_URL=http://你的服务器公网IP:3000
#   NEXTAUTH_SECRET=随便填一段长字符串（用 openssl rand -hex 32 生成更稳）
#   API_TOKEN_SIGNING_SECRET=另一段长随机字符串
# 注意：没有任何 LLM_API_KEY 这种东西要填 —— PIA Forge 不调 LLM

# 4. 用 Docker 起来
docker compose up -d --build

# 5. 初始化数据库（首次跑一次就行）
docker compose exec app npx prisma db push
docker compose exec app npm run db:seed
# ⚠️ seed 完后终端会打印一个 demo API Token，保存它！下文 Step 6 会用到
```

### Step 6 · 把 demo Token 用起来

Step 5 终端打印的 Token 形如 `pia_xxxxxxxx.xxxxxxxxxxxxxxxx`。立刻：

1. 用 curl 探活（在你电脑上）：
   ```bash
   curl http://你的服务器公网IP:3000/api/v1/health \
     -H "Authorization: Bearer pia_xxxxxxxx.xxxxxxxxxxxxxxxx"
   ```
2. 把它配到你的 Claude Code / Cursor 的 MCP 设置里（参考 `docs/mcp.md`）
3. 进入网页 `http://你的服务器公网IP:3000/settings/tokens` 看到这个 Token

> 这个 demo Token 是 ADMIN scope，给你自己用。**如果要给同事/外部人员用，请在网页上生成专门的 Token**（可以限定 scope，比如只读）。

### Step 7 · 验证

浏览器访问 `http://你的服务器公网IP:3000`，应该看到：
- PIA Forge 首页 + Hero 区
- 5 个 Module 卡片（PIA / Audit / Filing / Notice / Incident），PIA 显示 1，AUDIT 显示 1
- 3 个开放接口入口（Skill / MCP / REST API）
- 一份预填的「猎聘简历出境 PIA」demo 数据

点进 PIA 项目，能看到信息项 / 风险 / 措施都已经填好。

---

## 🔒 安全建议（上线后立刻做）

1. **关掉 RDS 公网访问** —— 只允许内网 IP 白名单。
2. **轻量服务器开防火墙** —— 控制台 → 安全 → 防火墙，只开放 22（SSH）+ 3000（应用）+ 443（如上 HTTPS）。
3. **NEXTAUTH_SECRET 必须改** —— 默认值是不安全的。
4. **OSS Bucket 设为私有** —— 不要公开读。
5. **定期看 RDS 自动备份** —— 默认每天备一次，保 7 天。

---

## 🆘 出问题的兜底

- **看应用日志**：`docker compose logs -f app`
- **重启**：`docker compose restart app`
- **完全重来**：`docker compose down -v && docker compose up -d --build`（**注意：会清空 docker 自带的临时数据库，但 RDS 上的数据是独立的、不会丢**）
- **数据迁移**：RDS 自带导入导出，控制台一键操作。

---

## 升级路径

| 阶段 | 建议 |
|------|------|
| 1-5 人自己用 | 现在这套就够了 |
| 5-20 人团队 | 升轻量服务器到 4C 4G；RDS 升 4C 8G |
| 对外提供 SaaS | 换 SAE（Serverless 应用引擎）+ RDS 高可用版 + SLB；上 ALB + WAF |
| 涉敏感数据 | 数据库加密 TDE；OSS 加 KMS 加密；ECS 内网 + 跳板机 |

## ⚠️ 关于网络互通

阿里云**轻量应用服务器**和 **RDS 默认不在同一个 VPC**：
- 轻量服务器：「轻量专属网络」
- RDS：「默认 VPC」

两种解法：
1. **简单方案**（PIA Forge 已采用）：用 RDS 的「外网连接地址」+ 在 RDS 白名单加上轻量服务器的**公网 IP**。多一点网络跳，但配置最简单。
2. **完美方案**：在 RDS 控制台「数据库连接 → 切换专有网络」，把 RDS 切到你能控制的 VPC，然后跟轻量服务器走内网。略复杂。

第一次部署用方案 1。后期想优化再切方案 2。
