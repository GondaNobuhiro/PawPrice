'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { NotificationItem } from '@/src/app/lib/notifications';

type Props = {
    notification: NotificationItem;
};

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('ja-JP', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function NotificationCard({ notification }: Props) {
    const router = useRouter();
    const [isRead, setIsRead] = useState(notification.isRead);
    const [removed, setRemoved] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [opening, setOpening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOpen = async () => {
        try {
            setOpening(true);
            if (!isRead) {
                await fetch(`/api/notifications/${notification.id}/read`, { method: 'PATCH' });
                setIsRead(true);
            }
            router.push(`/products/${notification.product.id}`);
        } catch {
            setOpening(false);
        }
    };

    const handleDelete = async () => {
        try {
            setDeleting(true);
            setError(null);
            const res = await fetch(`/api/notifications/${notification.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            setRemoved(true);
            router.refresh();
        } catch {
            setError('削除に失敗しました');
            setDeleting(false);
        }
    };

    if (removed) return null;

    return (
        <div className={`overflow-hidden rounded-3xl border shadow-sm transition-colors ${
            isRead ? 'border-[#eadfce] bg-white' : 'border-[#e8c99a] bg-[#fffaf3]'
        }`}>
            <div className="p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {!isRead && (
                            <span className="shrink-0 rounded-full bg-[#d98f5c] px-2.5 py-0.5 text-[11px] font-bold text-white">
                                未読
                            </span>
                        )}
                        <h3 className="font-semibold text-[#4b3425]">{notification.subject}</h3>
                    </div>
                    <span className="shrink-0 text-xs text-[#9f8d80]">
                        {formatDateTime(notification.createdAt)}
                    </span>
                </div>

                <p className="mb-3 text-sm leading-relaxed text-[#5c4c3d]">{notification.body}</p>

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                        href={`/products/${notification.product.id}`}
                        className="text-sm text-[#7a6657] hover:underline"
                    >
                        {notification.product.name}
                    </Link>
                    {notification.productOffer && (
                        <span className="text-sm font-semibold text-blue-700">
                            ¥{notification.productOffer.effectivePrice.toLocaleString()}
                            <span className="ml-1 font-normal text-[#7a6657] text-xs">
                                {notification.productOffer.shopType}
                            </span>
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[#eadfce] px-5 py-3">
                <button
                    type="button"
                    onClick={handleOpen}
                    disabled={opening}
                    className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {opening ? '移動中...' : '商品詳細を見る'}
                </button>

                {notification.productOffer && (
                    <a
                        href={notification.productOffer.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-xl border border-[#eadfce] px-4 py-2 text-sm text-[#7a6657] hover:bg-[#f5e8d8]"
                    >
                        ショップで見る
                    </a>
                )}

                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="ml-auto inline-flex items-center rounded-xl border border-[#eadfce] px-4 py-2 text-sm text-[#7a6657] hover:bg-[#f5e8d8] disabled:opacity-50"
                >
                    {deleting ? '削除中...' : '削除'}
                </button>
            </div>

            {error && (
                <div className="px-5 pb-3 text-sm text-red-600">{error}</div>
            )}
        </div>
    );
}
