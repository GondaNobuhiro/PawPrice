'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
    notificationId: string;
};

export default function DeleteNotificationButton({ notificationId }: Props) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        const ok = window.confirm('この通知を削除しますか？');
        if (!ok) return;

        try {
            setLoading(true);

            const res = await fetch(`/api/notifications/${notificationId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('通知削除に失敗しました');
            }

            router.refresh();
        } catch (error) {
            console.error(error);
            alert('通知削除に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-50"
        >
            {loading ? '削除中...' : '削除'}
        </button>
    );
}