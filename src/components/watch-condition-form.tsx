'use client';

import { useEffect, useState } from 'react';

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

type Toast = { type: 'success' | 'error'; message: string };

export default function WatchConditionForm({ productId }: Props) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const [exists, setExists] = useState(false);
    const [mode, setMode] = useState<'target' | 'lowest'>('target');
    const [targetPrice, setTargetPrice] = useState('');
    const [historicalLowestPrice, setHistoricalLowestPrice] = useState<number | null>(null);
    const [currentPrice, setCurrentPrice] = useState<number | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);

    const showToast = (t: Toast) => {
        setToast(t);
        setTimeout(() => setToast(null), 3000);
    };

    const fetchCondition = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/watchlists/${productId}/condition`, { cache: 'no-store' });
            if (!res.ok) throw new Error();
            const data: ConditionResponse = await res.json();
            setExists(data.exists);
            setTargetPrice(data.targetPrice?.toString() ?? '');
            setHistoricalLowestPrice(data.historicalLowestPrice);
            setCurrentPrice(data.currentPrice);
            setMode(data.mode ?? 'target');
        } catch {
            showToast({ type: 'error', message: '通知条件の取得に失敗しました' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCondition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productId]);

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await fetch(`/api/watchlists/${productId}/condition`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, targetPrice: mode === 'target' ? targetPrice : null }),
            });
            if (!res.ok) throw new Error();
            await fetchCondition();
            showToast({ type: 'success', message: '通知条件を保存しました' });
        } catch {
            showToast({ type: 'error', message: '通知条件の保存に失敗しました' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            setDeleting(true);
            setConfirmDelete(false);
            const res = await fetch(`/api/watchlists/${productId}/condition`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            await fetchCondition();
            showToast({ type: 'success', message: '通知条件を削除しました' });
        } catch {
            showToast({ type: 'error', message: '通知条件の削除に失敗しました' });
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return <div className="py-2 text-sm text-[#7a6657]">読み込み中...</div>;
    }

    return (
        <div className="space-y-3">
            {toast && (
                <div className={`rounded-xl px-4 py-2 text-sm font-medium ${
                    toast.type === 'success'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                }`}>
                    {toast.message}
                </div>
            )}

            <div className="text-sm text-[#7a6657]">
                現在価格:{' '}
                <span className="font-medium text-[#4b3425]">
                    {currentPrice !== null ? `¥${currentPrice.toLocaleString()}` : '取得できません'}
                </span>
            </div>

            {exists ? (
                <div className="space-y-3">
                    <div className="rounded-xl border border-[#eadfce] bg-white px-4 py-3 text-sm text-[#4b3425]">
                        {mode === 'target'
                            ? `目標価格: ¥${Number(targetPrice).toLocaleString()} を下回ったら通知`
                            : `過去最安値（¥${(historicalLowestPrice ?? currentPrice ?? 0).toLocaleString()}）を更新したら通知`}
                    </div>

                    {confirmDelete ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[#7a6657]">本当に削除しますか？</span>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="rounded-xl bg-red-500 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                            >
                                {deleting ? '削除中...' : '削除する'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(false)}
                                className="rounded-xl border border-[#eadfce] px-3 py-1.5 text-sm text-[#7a6657] hover:bg-[#f5e8d8]"
                            >
                                キャンセル
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            className="rounded-xl border border-[#eadfce] px-4 py-2 text-sm text-[#7a6657] hover:bg-[#f5e8d8]"
                        >
                            通知条件を削除
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="space-y-2">
                        <label className="flex items-start gap-2 text-sm text-[#4b3425]">
                            <input
                                type="radio"
                                name={`notify-mode-${productId}`}
                                checked={mode === 'target'}
                                onChange={() => setMode('target')}
                                className="mt-0.5"
                            />
                            <span className="flex-1">
                                <span className="mb-1.5 block font-medium">目標価格で通知</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={targetPrice}
                                    onChange={(e) => setTargetPrice(e.target.value)}
                                    placeholder="例: 2800"
                                    disabled={mode !== 'target'}
                                    className="w-full rounded-xl border border-[#eadfce] px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400"
                                />
                            </span>
                        </label>

                        <label className="flex items-center gap-2 text-sm text-[#4b3425]">
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
                    </div>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || (mode === 'target' && !targetPrice)}
                        className="rounded-xl bg-[#d98f5c] px-4 py-2 text-sm font-medium text-white hover:bg-[#c97d49] disabled:opacity-50"
                    >
                        {saving ? '保存中...' : '通知条件を保存'}
                    </button>
                </div>
            )}
        </div>
    );
}