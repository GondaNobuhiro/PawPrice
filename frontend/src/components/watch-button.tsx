'use client';

import { useState } from 'react';

type Props = {
    productId: string;
    initialWatched: boolean;
};

export default function WatchButton({ productId, initialWatched }: Props) {
    const [loading, setLoading] = useState(false);
    const [watched, setWatched] = useState(initialWatched);
    const [error, setError] = useState<string | null>(null);

    const handleToggleWatch = async () => {
        try {
            setLoading(true);
            setError(null);

            if (watched) {
                const res = await fetch(`/api/watchlists/${productId}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('ウォッチ解除に失敗しました');
                setWatched(false);
            } else {
                const res = await fetch('/api/watchlists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productId }),
                });
                if (!res.ok) throw new Error('ウォッチ追加に失敗しました');
                setWatched(true);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'ウォッチ操作に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-1">
            <button
                type="button"
                onClick={handleToggleWatch}
                disabled={loading}
                className={`rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                    watched
                        ? 'bg-[#7a6657] hover:bg-[#5e4f43]'
                        : 'bg-[#d98f5c] hover:bg-[#c97d49]'
                }`}
            >
                {loading ? '処理中...' : watched ? 'ウォッチ解除' : 'ウォッチ追加'}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}