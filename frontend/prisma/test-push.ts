import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { webpush } from '../src/lib/web-push';

const prisma = new PrismaClient({
    adapter: new PrismaPg(
        new Pool({ connectionString: process.env.DATABASE_URL }),
    ),
});

async function main() {
    const subs = await prisma.pushSubscription.findMany({
        where: { isActive: true },
    });

    if (subs.length === 0) {
        console.log('subscription not found');
        return;
    }

    for (const sub of subs) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dhKey,
                        auth: sub.authKey,
                    },
                },
                JSON.stringify({
                    title: 'テスト通知',
                    body: 'PawPriceの通知テストです',
                    url: 'http://localhost:3000',
                }),
            );

            console.log('送信成功');
        } catch (e) {
            console.error('送信失敗', e);
        }
    }
}

main().finally(() => prisma.$disconnect());