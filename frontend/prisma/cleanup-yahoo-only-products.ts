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

    // 非アクティブ商品のYahooオファーに紐づく価格履歴を削除
    const histDeleted = await prisma.$executeRaw`
        DELETE FROM price_histories
        WHERE product_offer_id IN (
            SELECT o.id FROM product_offers o
            JOIN products p ON p.id = o.product_id
            WHERE o.shop_type = 'yahoo' AND p.is_active = false
        )
    `;
    console.log(`価格履歴削除: ${histDeleted}件`);

    // 非アクティブ商品のYahooオファーを削除
    const offerDeleted = await prisma.$executeRaw`
        DELETE FROM product_offers
        WHERE shop_type = 'yahoo'
        AND product_id IN (SELECT id FROM products WHERE is_active = false)
    `;
    console.log(`Yahooオファー削除: ${offerDeleted}件`);

    // 非アクティブ商品の残存オファー（楽天の非アクティブ分等）の価格履歴も削除
    const histDeleted2 = await prisma.$executeRaw`
        DELETE FROM price_histories
        WHERE product_offer_id IN (
            SELECT o.id FROM product_offers o
            JOIN products p ON p.id = o.product_id
            WHERE p.is_active = false
        )
    `;
    console.log(`残存価格履歴削除: ${histDeleted2}件`);

    // 非アクティブ商品の残存オファーを全て削除
    const offerDeleted2 = await prisma.$executeRaw`
        DELETE FROM product_offers
        WHERE product_id IN (SELECT id FROM products WHERE is_active = false)
    `;
    console.log(`残存オファー削除: ${offerDeleted2}件`);

    // 非アクティブ商品のウォッチリストを削除
    const watchDeleted = await prisma.$executeRaw`
        DELETE FROM watchlists
        WHERE product_id IN (SELECT id FROM products WHERE is_active = false)
    `;
    console.log(`ウォッチリスト削除: ${watchDeleted}件`);

    // 非アクティブ商品を削除
    const productDeleted = await prisma.$executeRaw`
        DELETE FROM products WHERE is_active = false
    `;
    console.log(`商品削除: ${productDeleted}件`);

    console.log('\n=== 完了 ===');
    await prisma.$disconnect();
}
main().catch(console.error);
