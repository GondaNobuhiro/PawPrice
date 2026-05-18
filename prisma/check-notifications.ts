import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = (process.env.DATABASE_URL ?? "").replace("sslmode=require", "sslmode=verify-full");

if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString })),
});

async function main() {
    const watchlists = await prisma.watchlist.findMany({
        select: {
            user: {
                select: {
                    id: true,
                    email: true,
                    notifyEnabled: true,
                },
            },
            product: {
                select: {
                    id: true,
                    name: true,
                    offers: {
                        where: { isActive: true },
                        orderBy: { effectivePrice: 'asc' },
                        select: {
                            id: true,
                            effectivePrice: true,
                            lastFetchedAt: true,
                        },
                    },
                },
            },
            watchCondition: {
                select: {
                    targetPrice: true,
                    notifyOnLowest: true,
                },
            },
        },
    });

    const now = new Date();

    for (const watch of watchlists) {
        if (!watch.user.notifyEnabled) {
            continue;
        }

        if (!watch.watchCondition) {
            continue;
        }

        const lowestOffer = watch.product.offers[0];
        if (!lowestOffer) {
            continue;
        }

        const currentPrice = lowestOffer.effectivePrice;
        const condition = watch.watchCondition;

        let shouldNotify = false;
        let notificationType = '';
        let subject = '';
        let body = '';

        // 1. 目標価格通知
        if (
            condition.targetPrice !== null &&
            currentPrice <= condition.targetPrice
        ) {
            shouldNotify = true;
            notificationType = 'target_price';
            subject = `【PawPrice】${watch.product.name} が目標価格以下になりました`;
            body =
                `${watch.product.name} の現在価格は ¥${currentPrice.toLocaleString()} です。\n` +
                `目標価格は ¥${condition.targetPrice.toLocaleString()} です。`;
        }

        // 2. 過去最安値更新通知
        else if (condition.notifyOnLowest) {
            // 商品全オファーの履歴を横断して過去最安値を取得
            const allOfferIds = watch.product.offers.map((o) => o.id);
            const historicalLowest = await prisma.priceHistory.findFirst({
                where: {
                    productOfferId: { in: allOfferIds },
                    fetchedAt: {
                        lt: lowestOffer.lastFetchedAt,
                    },
                },
                orderBy: {
                    effectivePrice: 'asc',
                },
            });

            const previousLowestPrice = historicalLowest
                ? historicalLowest.effectivePrice
                : currentPrice;

            if (currentPrice < previousLowestPrice) {
                const diff = previousLowestPrice - currentPrice;

                shouldNotify = true;
                notificationType = 'lowest_price';
                subject = `【PawPrice】${watch.product.name} が過去最安値を更新しました`;
                body =
                    `${watch.product.name} の現在価格は ¥${currentPrice.toLocaleString()} です。\n` +
                    `これまでの最安値は ¥${previousLowestPrice.toLocaleString()} でした。\n` +
                    `¥${diff.toLocaleString()} 安くなりました。`;
            }
        }

        if (!shouldNotify) {
            continue;
        }

        // 同じ商品・同じタイプの通知が直近24時間以内に作成済みならスキップ
        const recentlySent = await prisma.notification.findFirst({
            where: {
                userId: watch.user.id,
                productId: watch.product.id,
                notificationType,
                createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
            },
        });
        if (recentlySent) {
            continue;
        }

        await prisma.notification.create({
            data: {
                user: {
                    connect: {
                        id: watch.user.id,
                    },
                },
                product: {
                    connect: {
                        id: watch.product.id,
                    },
                },
                productOffer: {
                    connect: {
                        id: lowestOffer.id,
                    },
                },
                notificationType,
                subject,
                body,
                status: 'pending',
            },
        });

        console.log(
            `notification created: user=${watch.user.email}, product=${watch.product.name}, type=${notificationType}, price=${currentPrice}`,
        );
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });