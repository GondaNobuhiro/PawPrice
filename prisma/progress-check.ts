import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL!, max: 2 })) });
async function main() {
    const start = new Date('2026-05-07T13:03:00Z');
    const added = await prisma.productOffer.count({ where: { shopType: 'yahoo', createdAt: { gte: start } } });
    const matched = await prisma.product.count({
        where: { janCode: { not: null }, offers: { some: { shopType: 'yahoo', lastFetchedAt: { gte: start } } } },
    });
    console.log(`追加オファー: ${added}件 / マッチ商品: ${matched} / 10,789件`);
    await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
