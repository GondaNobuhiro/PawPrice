import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })) });

const OLD_PARENT_CODES = ['food','snack','toilet','dish','cage','carry','toy','deodorant','care','wear','bed','outdoor','medical','other'];

async function main() {
  // 旧カスタム親の配下に残っているカテゴリ
  const oldParents = await prisma.category.findMany({
    where: { code: { in: OLD_PARENT_CODES } },
    select: { id: true, code: true, name: true },
  });

  for (const parent of oldParents) {
    const children = await prisma.category.findMany({
      where: { parentCategoryId: parent.id },
      select: { id: true, code: true, name: true, _count: { select: { products: true } } },
    });
    if (children.length > 0) {
      console.log(`\n[${parent.code}] 残存子カテゴリ: ${children.length}件`);
      children.forEach(c => console.log(`  - "${c.name}" (${c._count.products}件) [${c.code}]`));
    }
  }

  // parentCategoryId=null かつ rakuten_genre_ でない（旧カスタム親を除く）カテゴリ
  const orphans = await prisma.category.findMany({
    where: {
      parentCategoryId: null,
      code: { notIn: OLD_PARENT_CODES },
      NOT: { code: { startsWith: 'rakuten_genre_' } },
    },
    select: { id: true, code: true, name: true, _count: { select: { products: true } } },
  });
  if (orphans.length > 0) {
    console.log(`\n=== その他のトップレベルカテゴリ ===`);
    orphans.forEach(c => console.log(`  "${c.name}" [${c.code}] (${c._count.products}件)`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
