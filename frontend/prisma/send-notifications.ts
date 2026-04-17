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
    const notifications = await prisma.notification.findMany({
        where: {
            status: 'pending',
        },
        include: {
            user: true,
            product: true,
            productOffer: true,
        },
        orderBy: {
            createdAt: 'asc',
        },
    });

    if (notifications.length === 0) {
        console.log('送信対象の通知はありません');
        return;
    }

    for (const notification of notifications) {
        try {
            console.log('------------------------------');
            console.log(`To: ${notification.user.email}`);
            console.log(`Subject: ${notification.subject}`);
            console.log(`Body: ${notification.body}`);

            if (notification.productOffer) {
                console.log(
                    `Product URL: ${notification.productOffer.externalUrl}`,
                );
            }

            await prisma.notification.update({
                where: {
                    id: notification.id,
                },
                data: {
                    status: 'sent',
                    sentAt: new Date(),
                },
            });

            console.log(`送信完了: notificationId=${notification.id.toString()}`);
        } catch (error) {
            console.error(
                `送信失敗: notificationId=${notification.id.toString()}`,
                error,
            );

            await prisma.notification.update({
                where: {
                    id: notification.id,
                },
                data: {
                    status: 'failed',
                },
            });
        }
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