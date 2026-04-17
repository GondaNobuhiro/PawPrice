import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { webpush } from '../src/lib/web-push';

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const connectionString = process.env.DATABASE_URL;

if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL is not set');
}
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
            user: {
                include: {
                    pushSubscriptions: {
                        where: { isActive: true },
                    },
                },
            },
            product: true,
        },
        orderBy: {
            createdAt: 'asc',
        },
    });

    for (const notification of notifications) {
        const subscriptions = notification.user.pushSubscriptions;

        if (subscriptions.length === 0) {
            console.log(`push subscription not found: notificationId=${notification.id.toString()}`);
            continue;
        }

        let sent = false;

        for (const subscription of subscriptions) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.p256dhKey,
                            auth: subscription.authKey,
                        },
                    },
                    JSON.stringify({
                        title: notification.subject,
                        body: notification.body,
                        url: `${appUrl}/products/${notification.productId.toString()}`,
                    }),
                );

                sent = true;
            } catch (error: any) {
                console.error('push send failed', error);

                if (error?.statusCode === 404 || error?.statusCode === 410) {
                    await prisma.pushSubscription.update({
                        where: { id: subscription.id },
                        data: { isActive: false },
                    });
                }
            }
        }

        if (sent) {
            await prisma.notification.update({
                where: { id: notification.id },
                data: {
                    status: 'sent',
                    sentAt: new Date(),
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