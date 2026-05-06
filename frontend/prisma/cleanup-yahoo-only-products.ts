import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 3,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 10000,
    })),
});

async function main() {
    console.log('=== Yahoo限定商品の非アクティブ化 ===\n');

    // 楽天のアクティブオファーを持たず、Yahooのアクティブオファーを持つ商品を非アクティブ化
    // オファー・価格履歴は保持する
    const result = await prisma.$executeRaw`
        UPDATE products SET is_active = false
        WHERE is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM product_offers o
            WHERE o.product_id = products.id AND o.shop_type = 'rakuten' AND o.is_active = true
        )
        AND EXISTS (
            SELECT 1 FROM product_offers o
            WHERE o.product_id = products.id AND o.shop_type = 'yahoo' AND o.is_active = true
        )
    `;
    console.log(`Yahoo限定商品を非アクティブ化: ${result}件`);

    // オファーが1件もない孤立商品も非アクティブ化
    const orphans = await prisma.$executeRaw`
        UPDATE products SET is_active = false
        WHERE is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM product_offers o WHERE o.product_id = products.id
        )
    `;
    console.log(`孤立商品を非アクティブ化: ${orphans}件`);

    console.log('\n=== 完了 ===');
    await prisma.$disconnect();
}
main().catch(console.error);
