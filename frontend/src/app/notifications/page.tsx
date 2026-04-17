import Link from 'next/link';
import DeleteNotificationButton from '@/src/components/delete-notification-button';
import ClearNotificationsButton from '@/src/components/clear-notifications-button';

type NotificationItem = {
    id: string;
    notificationType: string;
    subject: string;
    body: string;
    status: string;
    sentAt: string | null;
    createdAt: string;
    product: {
        id: string;
        name: string;
    };
    productOffer: {
        id: string;
        shopType: string;
        effectivePrice: number;
        externalUrl: string;
    } | null;
};

async function getNotifications(): Promise<NotificationItem[]> {
    const res = await fetch('http://localhost:3000/api/notifications', {
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error('通知一覧の取得に失敗しました');
    }

    return res.json();
}

export default async function NotificationsPage() {
    const notifications = await getNotifications();

    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold">通知一覧</h1>
                    <ClearNotificationsButton />
                </div>

                <div className="mb-6 flex gap-4">
                    <Link href="/" className="text-blue-600 underline">
                        商品一覧へ戻る
                    </Link>
                    <Link href="/watchlists" className="text-blue-600 underline">
                        ウォッチリストへ
                    </Link>
                </div>

                {notifications.length === 0 ? (
                    <div className="rounded-xl border bg-white p-8 text-center text-gray-600 shadow-sm">
                        通知はありません
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className="rounded-xl border bg-white p-4 shadow-sm"
                            >
                                <div className="mb-2 text-lg font-semibold">
                                    {notification.subject}
                                </div>
                                <div className="text-sm text-gray-600">
                                    種別: {notification.notificationType}
                                </div>
                                <div className="text-sm text-gray-600">
                                    状態: {notification.status}
                                </div>
                                <div className="text-sm text-gray-600">
                                    作成日時: {new Date(notification.createdAt).toLocaleString('ja-JP')}
                                </div>
                                <div className="text-sm text-gray-600">
                                    送信日時:{' '}
                                    {notification.sentAt
                                        ? new Date(notification.sentAt).toLocaleString('ja-JP')
                                        : '未送信'}
                                </div>

                                <div className="mt-3 text-gray-800">{notification.body}</div>

                                <div className="mt-3">
                                    <Link
                                        href={`/products/${notification.product.id}`}
                                        className="text-blue-600 underline"
                                    >
                                        {notification.product.name}
                                    </Link>
                                </div>

                                {notification.productOffer && (
                                    <div className="mt-2 rounded-lg bg-blue-50 p-3">
                                        <div>ショップ: {notification.productOffer.shopType}</div>
                                        <div>
                                            実質価格: ¥
                                            {notification.productOffer.effectivePrice.toLocaleString()}
                                        </div>
                                        <a
                                            href={notification.productOffer.externalUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-2 inline-block text-blue-600 underline"
                                        >
                                            商品ページを見る
                                        </a>
                                    </div>
                                )}

                                <DeleteNotificationButton notificationId={notification.id} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}