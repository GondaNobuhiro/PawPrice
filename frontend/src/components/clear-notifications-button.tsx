'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearNotificationsButton() {
    const [confirm, setConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleClear = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/notifications/clear', { method: 'DELETE' });
            if (!res.ok) throw new Error();
            router.refresh();
        } catch {
            setError('削除に失敗しました');
            setLoading(false);
            setConfirm(false);
        }
    };

    if (confirm) {
        return (
            <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[#7a6657]">すべて削除しますか？</span>
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={loading}
                        className="rounded-xl bg-red-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                        {loading ? '削除中...' : '削除'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setConfirm(false)}
                        className="rounded-xl border border-[#eadfce] px-3 py-1.5 text-sm text-[#7a6657] hover:bg-[#f5e8d8]"
                    >
                        キャンセル
                    </button>
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => setConfirm(true)}
            className="rounded-xl border border-[#eadfce] px-4 py-2 text-sm text-[#7a6657] hover:bg-[#f5e8d8]"
        >
            すべて削除
        </button>
    );
}