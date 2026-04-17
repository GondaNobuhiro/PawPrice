'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearNotificationsButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleClear = async () => {
        const ok = window.confirm('通知をすべて削除しますか？');
        if (!ok) return;

        try {
            setLoading(true);

            const res = await fetch('/api/notifications/clear', {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('通知の一括削除に失敗しました');
            }

            router.refresh();
        } catch (error) {
            console.error(error);
            alert('通知の一括削除に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-50"
        >
            {loading ? '削除中...' : '通知をすべて削除'}
        </button>
    );
}