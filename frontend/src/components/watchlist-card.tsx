'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import WatchConditionForm from '@/src/components/watch-condition-form';
import type { WatchlistItem } from '@/src/app/lib/watchlists';

type Props = {
    item: WatchlistItem;
    onRemove: (id: string) => void;
};

export default function WatchlistCard({ item, onRemove }: Props) {
    const [unwatching, setUnwatching] = useState(false);
    const [showCondition, setShowCondition] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUnwatch = async () => {
        try {
            setUnwatching(true);
            setError(null);
            const res = await fetch(`/api/watchlists/${item.product.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            onRemove(item.id);
        } catch {
            setError('ウォッチ解除に失敗しました');
            setUnwatching(false);
        }
    };

    const { product } = item;

    return (
        <div className="rounded-3xl border border-[#eadfce] bg-white shadow-sm overflow-hidden">
            <div className="flex gap-4 p-5">
                <div className="shrink-0">
                    {product.imageUrl ? (
                        <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={80}
                            height={80}
                            className="h-20 w-20 rounded-xl border border-[#eadfce] object-contain bg-white p-1"
                        />
                    ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-[#eadfce] bg-gray-50 text-xs text-gray-400">
                            画像なし
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <Link
                        href={`/products/${product.id}`}
                        className="line-clamp-2 text-base font-semibold text-[#4b3425] hover:underline"
                    >
                        {product.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-x-1.5 text-xs text-[#7a6657]">
                        <span>{product.category}</span>
                        {product.brand && <><span>·</span><span>{product.brand}</span></>}
                        {product.packageSize && <><span>·</span><span>{product.packageSize}</span></>}
                    </div>

                    {product.lowestOffer ? (
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-xl font-bold text-blue-700">
                                ¥{product.lowestOffer.effectivePrice.toLocaleString()}
                            </span>
                            <span className="text-xs text-[#7a6657]">{product.lowestOffer.shopType}</span>
                        </div>
                    ) : (
                        <div className="mt-2 text-sm text-[#7a6657]">価格情報なし</div>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[#eadfce] px-5 py-3">
                {product.lowestOffer && (
                    <a
                        href={product.lowestOffer.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        商品ページを見る
                    </a>
                )}
                <button
                    type="button"
                    onClick={() => setShowCondition((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#eadfce] px-4 py-2 text-sm text-[#7a6657] hover:bg-[#f5e8d8]"
                >
                    {showCondition ? '▲' : '▼'} 通知設定
                </button>
                <button
                    type="button"
                    onClick={handleUnwatch}
                    disabled={unwatching}
                    className="ml-auto inline-flex items-center rounded-xl border border-[#eadfce] px-4 py-2 text-sm text-[#7a6657] hover:bg-[#f5e8d8] disabled:opacity-50"
                >
                    {unwatching ? '解除中...' : 'ウォッチ解除'}
                </button>
            </div>

            {error && (
                <div className="px-5 pb-3 text-sm text-red-600">{error}</div>
            )}

            {showCondition && (
                <div className="border-t border-[#eadfce] bg-[#faf7f3] px-5 py-4">
                    <WatchConditionForm productId={product.id} />
                </div>
            )}
        </div>
    );
}