# 本地开发指南

## 环境要求

- Node.js >= 20
- Docker Desktop（拉 Postgres 用）

## ⚠️ npm registry 提示

项目内置 `.npmrc` 指向 `https://registry.npmjs.org/`。

如果你公司 mac 上的 `~/.npmrc` 配了内部镜像（比如 `registry.tongdao.cn`），项目级 `.npmrc` 会优先生效。如果遇到 DNS 解析失败，把项目 `.npmrc` 改成你能访问的镜像即可：

- 阿里云 npm 镜像（推荐国内用户）：`registry=https://registry.npmmirror.com`
- 公司内网：`registry=https://registry.your-company.cn`

## 一次性初始化

```bash
git clone https://github.com/juejiangxiaopianzi/pia-forge.git
cd pia-forge

# 1. 装依赖
npm install

# 2. 起 Postgres
docker compose up -d db

# 3. 设环境变量
cp .env.example .env
# .env 默认配置已经能跑（连本地 docker 起的 postgres）

# 4. 建表 + 灌 demo 数据
npm run db:push
npm run db:seed

# 5. 跑起来
npm run dev
```

打开 http://localhost:3000，看到首页 + 一个 demo PIA 项目即可。

## 常用命令

| 命令 | 用途 |
|------|------|
| `npm run dev` | 本地开发，热重载 |
| `npm run build` | 构建生产版 |
| `npm run start` | 跑生产版 |
| `npm run db:push` | 把 schema 推到数据库（开发期用） |
| `npm run db:migrate` | 创建迁移文件（正式部署用） |
| `npm run db:studio` | 打开 Prisma 可视化数据浏览器 |
| `npm run db:seed` | 重置并灌入 demo 数据 |
