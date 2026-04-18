'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type NotificationPreviewItem = {
    id: string;
    subject: string;
    body: string;
    isRead: boolean;
    createdAt: string;
    product: {
        id: string;
        name: string;
    };
};

export default function NotificationBell() {
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [notifications, setNotifications] = useState<NotificationPreviewItem[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const router = useRouter();

    const fetchUnreadCount = async () => {
        try {
            const res = await fetch('/api/notifications/unread-count', {
                cache: 'no-store',
            });

            if (!res.ok) return;

            const data: { unreadCount: number } = await res.json();
            setUnreadCount(data.unreadCount);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchPreview = async () => {
        try {
            setPreviewLoading(true);

            const res = await fetch('/api/notifications/preview', {
                cache: 'no-store',
            });

            if (!res.ok) return;

            const data: NotificationPreviewItem[] = await res.json();
            setNotifications(data);
        } catch (error) {
            console.error(error);
        } finally {
            setPreviewLoading(false);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
        const intervalId = window.setInterval(fetchUnreadCount, 30000);
        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (!open) return;

        fetchPreview();

        const handleClickOutside = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const handleBellClick = async () => {
        setOpen((prev) => !prev);
    };

    const handleOpenNotification = async (notificationId: string, productId: string) => {
        try {
            setLoading(true);

            await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PATCH',
            });

            setNotifications((prev) =>
                prev.map((item) =>
                    item.id === notificationId ? { ...item, isRead: true } : item,
                ),
            );

            setUnreadCount((prev) => Math.max(0, prev - 1));
            setOpen(false);

            router.push(`/products/${productId}`);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('通知を開けませんでした');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAll = async () => {
        try {
            setLoading(true);

            await fetch('/api/notifications/read-all', {
                method: 'PATCH',
            });

            setUnreadCount(0);
            setOpen(false);

            router.push('/notifications');
            router.refresh();
        } catch (error) {
            console.error(error);
            router.push('/notifications');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={handleBellClick}
                disabled={loading}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#eadfce] bg-[#fffdf9] shadow-sm transition hover:bg-[#f8f0e5] disabled:opacity-50"
                aria-label="通知一覧"
                title="通知一覧"
            >
                <Bell className="h-5 w-5 text-[#7a6657]" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#d98f5c] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-14 z-50 w-[360px] overflow-hidden rounded-3xl border border-[#eadfce] bg-[#fffdf9] shadow-xl">
                    <div className="flex items-center justify-between border-b border-[#efe4d7] px-4 py-3">
                        <div className="text-sm font-semibold text-[#4b3425]">通知</div>
                        {unreadCount > 0 && (
                            <span className="rounded-full bg-[#f5e8d8] px-2 py-0.5 text-xs font-medium text-[#9a6b3d]">
                未読 {unreadCount}
              </span>
                        )}
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                        {previewLoading ? (
                            <div className="p-4 text-sm text-[#8e7a6c]">読み込み中...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-sm text-[#8e7a6c]">通知はありません</div>
                        ) : (
                            notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    type="button"
                                    onClick={() =>
                                        handleOpenNotification(notification.id, notification.product.id)
                                    }
                                    className={`block w-full border-b border-[#f1e7db] px-4 py-3 text-left transition hover:bg-[#faf4eb] ${
                                        notification.isRead ? 'bg-white' : 'bg-[#fff6ec]'
                                    }`}
                                >
                                    <div className="mb-1 flex items-center gap-2">
                                        {!notification.isRead && (
                                            <span className="rounded-full bg-[#d98f5c] px-2 py-0.5 text-[10px] font-bold text-white">
                        未読
                      </span>
                                        )}
                                        <div className="line-clamp-1 text-sm font-semibold text-[#4b3425]">
                                            {notification.subject}
                                        </div>
                                    </div>

                                    <div className="line-clamp-2 text-xs text-[#7a6657]">
                                        {notification.body}
                                    </div>

                                    <div className="mt-2 flex items-center justify-between text-[11px] text-[#9f8d80]">
                                        <span className="line-clamp-1">{notification.product.name}</span>
                                        <span>
                      {new Date(notification.createdAt).toLocaleString('ja-JP', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                      })}
                    </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-[#efe4d7] px-4 py-3">
                        <button
                            type="button"
                            onClick={handleOpenAll}
                            className="text-sm text-[#c97d49] underline"
                        >
                            通知一覧を見る
                        </button>

                        <Link
                            href="/notifications"
                            onClick={() => setOpen(false)}
                            className="text-sm text-[#8e7a6c] hover:text-[#5c4331]"
                        >
                            閉じる
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}