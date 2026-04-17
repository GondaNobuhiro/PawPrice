import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString })),
});

async function main() {
    const watchlists = await prisma.watchlist.findMany({
        include: {
            user: true,
            product: {
                include: {
                    offers: {
                        where: {
                            isActive: true,
                        },
                        orderBy: {
                            effectivePrice: 'asc',
                        },
                    },
                },
            },
            watchCondition: true,
        },
    });

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
            const historicalLowest = await prisma.priceHistory.findFirst({
                where: {
                    productOfferId: lowestOffer.id,
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