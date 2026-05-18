import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL, max: 3 })),
});

async function main() {
    const yahooOffers = await prisma.productOffer.count({ where: { shopType: 'yahoo', isActive: true } });
    console.log('Yahoo有効オファー数:', yahooOffers);

    // JAN付き商品数
    const withJan = await prisma.product.count({ where: { janCode: { not: null } } });
    console.log('JAN付き商品数:', withJan);

    // Yahoo オファーのない JAN 付き商品
    const withYahooOffer = await prisma.$queryRaw<[{count: bigint}]>`
        SELECT COUNT(DISTINCT p.id) as count
        FROM products p
        WHERE p.jan_code IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM product_offers po
            WHERE po.product_id = p.id AND po.shop_type = 'yahoo' AND po.is_active = true
        )
    `;
    console.log('Yahoo登録済みJAN商品:', Number(withYahooOffer[0].count));

    const withoutYahoo = withJan - Number(withYahooOffer[0].count);
    console.log('Yahoo未登録JAN商品:', withoutYahoo);

    await prisma.$disconnect();
}
main().catch(console.error);
