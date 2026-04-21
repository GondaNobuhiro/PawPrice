import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});
async function main() {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!user) {
        console.error('ユーザーが見つかりません。先にブラウザでアクセスしてください。');
        process.exit(1);
    }

    // ウォッチリストにある商品を取得
    const watchlist = await prisma.watchlist.findFirst({
        where: { userId: user.id },
        include: {
            product: {
                include: {
                    offers: {
                        where: { isActive: true },
                        orderBy: { effectivePrice: 'asc' },
                        take: 1,
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    if (!watchlist) {
        console.error('ウォッチリストに商品がありません。先に商品をウォッチ登録してください。');
        process.exit(1);
    }

    const product = watchlist.product;
    const offer = product.offers[0] ?? null;
    const price = offer ? `¥${offer.effectivePrice.toLocaleString()}` : '(価格不明)';
    const shop = offer?.shopType ?? '';

    const notification = await prisma.notification.create({
        data: {
            userId: user.id,
            productId: product.id,
            productOfferId: offer?.id ?? null,
            notificationType: 'price_drop',
            subject: `値下がり通知: ${product.name.slice(0, 40)}`,
            body: `ウォッチ中の商品が値下がりしました。\n現在の実質価格: ${price}${shop ? `（${shop}）` : ''}`,
            status: 'pending',
            isRead: false,
        },
    });

    console.log('テスト通知を作成しました:');
    console.log(`  ID: ${notification.id}`);
    console.log(`  商品: ${product.name}`);
    console.log(`  価格: ${price}`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());