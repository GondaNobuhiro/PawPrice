'use client';

import { useEffect, useState } from 'react';

type Props = {
    productId: string;
};

export default function WatchButton({ productId }: Props) {
    const [loading, setLoading] = useState(false);
    const [watched, setWatched] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/watchlists/status/${productId}`, { cache: 'no-store' });
                if (!res.ok) throw new Error();
                const data: { watched: boolean } = await res.json();
                setWatched(data.watched);
            } catch {
                // silently ignore — button stays hidden until initialized
            } finally {
                setInitialized(true);
            }
        };

        fetchStatus();
    }, [productId]);

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

    if (!initialized) {
        return (
            <button
                type="button"
                disabled
                className="rounded-xl border border-[#eadfce] px-4 py-2 text-sm text-[#7a6657] opacity-50"
            >
                読み込み中...
            </button>
        );
    }

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