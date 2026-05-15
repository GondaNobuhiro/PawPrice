import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { webpush } from '../src/lib/web-push';

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const connectionString = (process.env.DATABASE_URL ?? "").replace("sslmode=require", "sslmode=verify-full");

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
        where: { status: 'pending' },
        include: {
            user: {
                include: {
                    pushSubscriptions: { where: { isActive: true } },
                },
            },
            product: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    if (notifications.length === 0) {
        console.log('送信対象の通知はありません');
        return;
    }

    // ユーザーごとにグループ化
    const byUser = new Map<string, typeof notifications>();
    for (const n of notifications) {
        const key = n.userId.toString();
        if (!byUser.has(key)) byUser.set(key, []);
        byUser.get(key)!.push(n);
    }

    for (const [userId, userNotifications] of byUser) {
        const subscriptions = userNotifications[0].user.pushSubscriptions;

        if (subscriptions.length === 0) {
            console.log(`push subscription not found: userId=${userId}`);
            continue;
        }

        const count = userNotifications.length;
        const pushPayload = count === 1
            ? {
                title: userNotifications[0].subject,
                body: userNotifications[0].body,
                url: `${appUrl}/products/${userNotifications[0].productId.toString()}`,
            }
            : {
                title: `${count}件の値下がりがあります`,
                body: userNotifications.map((n) => n.product.name).join('、').slice(0, 100),
                url: `${appUrl}/notifications`,
            };

        let sent = false;

        for (const subscription of subscriptions) {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: subscription.endpoint,
                        keys: { p256dh: subscription.p256dhKey, auth: subscription.authKey },
                    },
                    JSON.stringify(pushPayload),
                );
                sent = true;
            } catch (error: any) {
                console.error(`push send failed: userId=${userId}`, error?.statusCode, error?.message);

                if (error?.statusCode === 404 || error?.statusCode === 410) {
                    await prisma.pushSubscription.update({
                        where: { id: subscription.id },
                        data: { isActive: false },
                    });
                }
            }
        }

        if (sent) {
            const ids = userNotifications.map((n) => n.id);
            await prisma.notification.updateMany({
                where: { id: { in: ids } },
                data: { status: 'sent', sentAt: new Date() },
            });
            console.log(`送信完了: userId=${userId}, ${count}件 → push 1回`);
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