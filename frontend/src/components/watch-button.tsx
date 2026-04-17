'use client';

import { useEffect, useState } from 'react';

type Props = {
    productId: string;
};

export default function WatchButton({ productId }: Props) {
    const [loading, setLoading] = useState(false);
    const [watched, setWatched] = useState(false);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/watchlists/status/${productId}`, {
                    cache: 'no-store',
                });

                if (!res.ok) {
                    throw new Error('ウォッチ状態の取得に失敗しました');
                }

                const data: { watched: boolean } = await res.json();
                setWatched(data.watched);
            } catch (error) {
                console.error(error);
            } finally {
                setInitialized(true);
            }
        };

        fetchStatus();
    }, [productId]);

    const handleToggleWatch = async () => {
        try {
            setLoading(true);

            if (watched) {
                const res = await fetch(`/api/watchlists/${productId}`, {
                    method: 'DELETE',
                });

                if (!res.ok) {
                    throw new Error('ウォッチ解除に失敗しました');
                }

                setWatched(false);
            } else {
                const res = await fetch('/api/watchlists', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ productId }),
                });

                if (!res.ok) {
                    throw new Error('ウォッチ追加に失敗しました');
                }

                setWatched(true);
            }
        } catch (error) {
            console.error(error);
            alert('ウォッチ操作に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    if (!initialized) {
        return (
            <button
                type="button"
                disabled
                className="rounded-xl bg-gray-300 px-4 py-2 text-sm text-white"
            >
                読み込み中...
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleToggleWatch}
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm text-white disabled:opacity-50 ${
                watched ? 'bg-gray-600' : 'bg-amber-500'
            }`}
        >
            {loading ? '処理中...' : watched ? 'ウォッチ解除' : 'ウォッチ追加'}
        </button>
    );
}