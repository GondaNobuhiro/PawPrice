'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
    productId: string;
};

type ConditionResponse = {
    exists: boolean;
    targetPrice: number | null;
    notifyOnLowest: boolean;
    historicalLowestPrice: number | null;
    currentPrice: number | null;
    mode: 'target' | 'lowest' | null;
};

export default function WatchConditionForm({ productId }: Props) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [exists, setExists] = useState(false);
    const [mode, setMode] = useState<'target' | 'lowest'>('target');
    const [targetPrice, setTargetPrice] = useState('');
    const [historicalLowestPrice, setHistoricalLowestPrice] = useState<number | null>(null);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);

    const router = useRouter();

    const fetchCondition = async () => {
        try {
            setLoading(true);

            const res = await fetch(`/api/watchlists/${productId}/condition`, {
                cache: 'no-store',
            });

            if (!res.ok) {
                throw new Error('通知条件の取得に失敗しました');
            }

            const data: ConditionResponse = await res.json();

            setExists(data.exists);
            setTargetPrice(data.targetPrice?.toString() ?? '');
            setHistoricalLowestPrice(data.historicalLowestPrice);
            setCurrentPrice(data.currentPrice);
            setMode(data.mode ?? 'target');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCondition();
    }, [productId]);

    const handleSave = async () => {
        try {
            setSaving(true);

            const res = await fetch(`/api/watchlists/${productId}/condition`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mode,
                    targetPrice: mode === 'target' ? targetPrice : null,
                }),
            });

            if (!res.ok) {
                throw new Error('通知条件の保存に失敗しました');
            }

            await fetchCondition();
            router.refresh();
            alert('通知条件を保存しました');
        } catch (error) {
            console.error(error);
            alert('通知条件の保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        const ok = window.confirm('通知条件を削除しますか？');
        if (!ok) return;

        try {
            setDeleting(true);

            const res = await fetch(`/api/watchlists/${productId}/condition`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('通知条件の削除に失敗しました');
            }

            await fetchCondition();
            router.refresh();
            alert('通知条件を削除しました');
        } catch (error) {
            console.error(error);
            alert('通知条件の削除に失敗しました');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
                通知条件を読み込み中...
            </div>
        );
    }

    if (exists) {
        return (
            <div className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold">通知条件</h2>

                <div className="space-y-2 text-sm text-gray-700">
                    <div>
                        現在価格:{' '}
                        {currentPrice !== null
                            ? `¥${currentPrice.toLocaleString()}`
                            : '取得できません'}
                    </div>
                    <div>
                        通知方式:{' '}
                        {mode === 'target'
                            ? `目標価格（¥${Number(targetPrice).toLocaleString()}）`
                            : `過去最安値更新（基準: ¥${(historicalLowestPrice ?? currentPrice ?? 0).toLocaleString()}）`}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-50"
                >
                    {deleting ? '削除中...' : '通知条件を削除'}
                </button>
            </div>
        );
    }

    return (
        <div className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold">通知条件</h2>

            <div className="mb-4 text-sm text-gray-700">
                現在価格:{' '}
                {currentPrice !== null
                    ? `¥${currentPrice.toLocaleString()}`
                    : '取得できません'}
            </div>

            <div className="space-y-4">
                <label className="flex items-start gap-2 text-sm">
                    <input
                        type="radio"
                        name={`notify-mode-${productId}`}
                        checked={mode === 'target'}
                        onChange={() => setMode('target')}
                    />
                    <span className="flex-1">
            <span className="mb-1 block font-medium">目標価格で通知</span>
            <input
                type="number"
                min="0"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="例: 2800"
                disabled={mode !== 'target'}
                className="w-full rounded-lg border px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </span>
                </label>

                <label className="flex items-start gap-2 text-sm">
                    <input
                        type="radio"
                        name={`notify-mode-${productId}`}
                        checked={mode === 'lowest'}
                        onChange={() => setMode('lowest')}
                    />
                    <span>
            過去最安値（¥{(historicalLowestPrice ?? currentPrice ?? 0).toLocaleString()}）を更新したら通知
          </span>
                </label>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || (mode === 'target' && !targetPrice)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                >
                    {saving ? '保存中...' : '通知条件を保存'}
                </button>
            </div>
        </div>
    );
}