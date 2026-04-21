import type { Metadata } from 'next';
import NotificationCard from '@/src/components/notification-card';
import ClearNotificationsButton from '@/src/components/clear-notifications-button';
import { getNotifications } from '@/src/app/lib/notifications';

export const metadata: Metadata = {
    title: '通知',
};

export default async function NotificationsPage() {
    const notifications = await getNotifications();
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <main className="min-h-screen bg-[#f8f4ee] px-6 py-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-[#4b3425]">通知</h1>
                        {unreadCount > 0 && (
                            <span className="rounded-full bg-[#d98f5c] px-2.5 py-0.5 text-sm font-bold text-white">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    {notifications.length > 0 && <ClearNotificationsButton />}
                </div>

                {notifications.length === 0 ? (
                    <div className="rounded-3xl border border-[#eadfce] bg-white px-6 py-16 text-center shadow-sm">
                        <div className="mb-4 text-5xl">🔔</div>
                        <p className="font-medium text-[#4b3425]">通知はありません</p>
                        <p className="mt-1 text-sm text-[#7a6657]">
                            ウォッチ中の商品が値下がりしたときにお知らせします
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notifications.map((notification) => (
                            <NotificationCard key={notification.id} notification={notification} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}