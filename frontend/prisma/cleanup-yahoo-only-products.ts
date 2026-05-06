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
    console.log('=== Yahoo限定商品のクリーンアップ ===\n');

    // 楽天のアクティブオファーを持たず、Yahooのアクティブオファーを持つ商品を取得
    const rows = await prisma.$queryRaw<{ id: bigint }[]>`
        SELECT p.id FROM products p
        WHERE NOT EXISTS (
            SELECT 1 FROM product_offers o
            WHERE o.product_id = p.id AND o.shop_type = 'rakuten' AND o.is_active = true
        )
        AND EXISTS (
            SELECT 1 FROM product_offers o
            WHERE o.product_id = p.id AND o.shop_type = 'yahoo' AND o.is_active = true
        )
    `;

    const ids = rows.map((r) => r.id);
    console.log(`対象商品: ${ids.length}件`);
    if (ids.length === 0) {
        // オファーがない孤立商品も削除
        const orphans = await prisma.$queryRaw<{ id: bigint }[]>`
            SELECT p.id FROM products p
            WHERE NOT EXISTS (SELECT 1 FROM product_offers o WHERE o.product_id = p.id)
        `;
        const orphanIds = orphans.map((r) => r.id);
        if (orphanIds.length > 0) {
            const deleted = await prisma.$executeRaw`DELETE FROM products WHERE id = ANY(${orphanIds}::bigint[])`;
            console.log(`孤立商品削除: ${deleted}件`);
        } else {
            console.log('削除対象なし');
        }
        await prisma.$disconnect();
        return;
    }

    const histDeleted = await prisma.$executeRaw`
        DELETE FROM price_histories
        WHERE product_offer_id IN (
            SELECT id FROM product_offers WHERE product_id = ANY(${ids}::bigint[])
        )
    `;
    console.log(`価格履歴削除: ${histDeleted}件`);

    const offerDeleted = await prisma.$executeRaw`
        DELETE FROM product_offers WHERE product_id = ANY(${ids}::bigint[])
    `;
    console.log(`オファー削除: ${offerDeleted}件`);

    const watchDeleted = await prisma.$executeRaw`
        DELETE FROM watchlists WHERE product_id = ANY(${ids}::bigint[])
    `;
    console.log(`ウォッチ削除: ${watchDeleted}件`);

    const productDeleted = await prisma.$executeRaw`
        DELETE FROM products WHERE id = ANY(${ids}::bigint[])
    `;
    console.log(`商品削除: ${productDeleted}件`);

    // 孤立商品（オファーゼロ）も合わせて削除
    const orphans = await prisma.$queryRaw<{ id: bigint }[]>`
        SELECT p.id FROM products p
        WHERE NOT EXISTS (SELECT 1 FROM product_offers o WHERE o.product_id = p.id)
    `;
    if (orphans.length > 0) {
        const orphanIds = orphans.map((r) => r.id);
        const orphanDeleted = await prisma.$executeRaw`DELETE FROM products WHERE id = ANY(${orphanIds}::bigint[])`;
        console.log(`孤立商品追加削除: ${orphanDeleted}件`);
    }

    console.log('\n=== 完了 ===');
    await prisma.$disconnect();
}
main().catch(console.error);
