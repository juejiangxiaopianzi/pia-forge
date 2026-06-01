/**
 * 给 demo owner 设一个初始密码 · 方便登录
 * Usage: tsx /tmp/set-owner-password.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const INITIAL_EMAIL = 'huangyue@pia-forge.local';
  const INITIAL_PASSWORD = 'PiaForge2026';

  // 找 owner(seed 里那个 owner@example.com)
  const owner = await db.user.findFirst({ where: { email: { contains: 'owner@example.com' } } });
  if (!owner) {
    console.log('❌ 没找到 owner user');
    process.exit(1);
  }

  const hash = await bcrypt.hash(INITIAL_PASSWORD, 10);
  const updated = await db.user.update({
    where: { id: owner.id },
    data: {
      email: INITIAL_EMAIL,
      passwordHash: hash,
      name: '黄越',
    },
  });

  console.log('');
  console.log('================================');
  console.log('  ✅ owner 账号已设密码');
  console.log('================================');
  console.log(`  邮箱:  ${INITIAL_EMAIL}`);
  console.log(`  密码:  ${INITIAL_PASSWORD}`);
  console.log(`  user id: ${updated.id}`);
  console.log('================================');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
