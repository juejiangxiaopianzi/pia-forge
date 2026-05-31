#!/usr/bin/env bash
# 一键本地启动 · 仅 macOS（用 brew 装 postgres）
# 给 fork PIA Forge 的 Mac 用户用 · 不想装 Docker 的人走这条路

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "──────────────────────────────────────────────────────"
echo "  PIA Forge · Mac 本地一键启动"
echo "──────────────────────────────────────────────────────"

# 1. 依赖检查
command -v node >/dev/null || { echo "❌ 缺 Node.js >= 20，去 https://nodejs.org/ 装"; exit 1; }
command -v brew >/dev/null || { echo "❌ 缺 Homebrew，去 https://brew.sh/ 装"; exit 1; }

# 2. PostgreSQL 16
if ! command -v /opt/homebrew/opt/postgresql@16/bin/postgres >/dev/null 2>&1; then
  echo "📦 装 PostgreSQL 16 ..."
  brew install postgresql@16
fi

# 启动 postgres 服务（如未启动）
brew services start postgresql@16 >/dev/null 2>&1 || true
sleep 2

PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
export PATH="$PG_BIN:$PATH"

# 3. 建数据库（幂等）
DB_USER="${USER}"
DB_NAME="pia_forge"
if ! psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo "🗄  创建数据库 $DB_NAME ..."
  createdb "$DB_NAME"
fi

# 4. .env
if [ ! -f .env ]; then
  echo "📝 复制 .env.example → .env"
  cp .env.example .env
  # 改 DATABASE_URL 指本机
  sed -i.bak "s|postgresql://pia:pia_dev@localhost:5432/pia_forge|postgresql://${DB_USER}@localhost:5432/${DB_NAME}|" .env
  rm -f .env.bak
fi

# 5. 依赖
if [ ! -x node_modules/.bin/next ]; then
  echo "📦 npm install ..."
  npm install --no-audit --no-fund
fi

# 6. 推 schema
echo "🔧 prisma db push ..."
npm run db:push

# 7. seed demo（仅当数据库是空的，避免覆盖你的数据）
COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT count(*) FROM \"PiaProject\";" 2>/dev/null || echo "0")
if [ "$COUNT" = "0" ]; then
  echo "🌱 灌 demo 数据 ..."
  npm run db:seed
else
  echo "✅ 检测到已有数据，跳过 seed"
fi

# 8. 启动 dev
echo ""
echo "──────────────────────────────────────────────────────"
echo "  即将启动 dev server"
echo "  浏览器打开 http://localhost:3000"
echo "  Ctrl+C 退出"
echo "──────────────────────────────────────────────────────"
echo ""

npm run dev
