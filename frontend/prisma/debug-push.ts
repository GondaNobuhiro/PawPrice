import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { webpush } from '../src/lib/web-push';

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

async function main() {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!user) {
        console.error('ユーザーが見つかりません。先にブラウザでアクセスしてください。');
        process.exit(1);
    }

    // Push subscription の確認
    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: user.id, isActive: true },
    });

    console.log(`\n[1] Push subscriptions: ${subscriptions.length}件`);
    for (const s of subscriptions) {
        console.log(`  - id=${s.id}, endpoint=${s.endpoint.slice(0, 60)}...`);
    }

    if (subscriptions.length === 0) {
        console.log('  → ブラウザでプッシュ通知を有効化してください（「通知を有効化」ボタン）');
        return;
    }

    // pending 通知の確認
    const pending = await prisma.notification.findMany({
        where: { userId: user.id, status: 'pending' },
    });
    console.log(`\n[2] Pending notifications: ${pending.length}件`);

    // テスト送信
    console.log('\n[3] テスト push 送信...');
    for (const s of subscriptions) {
        try {
            const result = await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dhKey, auth: s.authKey } },
                JSON.stringify({
                    title: 'PawPrice テスト通知',
                    body: 'プッシュ通知の動作確認です',
                    url: `${process.env.NEXT_PUBLIC_APP_URL}/notifications`,
                }),
            );
            console.log(`  ✓ 送信成功: statusCode=${result.statusCode}`);
        } catch (err: any) {
            console.error(`  ✗ 送信失敗: statusCode=${err?.statusCode}`);
            console.error(`    message: ${err?.message}`);
            console.error(`    body: ${err?.body}`);

            if (err?.statusCode === 404 || err?.statusCode === 410) {
                console.log('  → subscriptionが無効になっています。ブラウザで再登録してください。');
                await prisma.pushSubscription.update({
                    where: { id: s.id },
                    data: { isActive: false },
                });
            }
        }
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());