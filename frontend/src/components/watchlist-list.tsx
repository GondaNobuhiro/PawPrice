'use client';

import { useState } from 'react';
import Link from 'next/link';
import WatchlistCard from '@/src/components/watchlist-card';
import type { WatchlistItem } from '@/src/app/lib/watchlists';

type Props = {
    initialItems: WatchlistItem[];
};

export default function WatchlistList({ initialItems }: Props) {
    const [items, setItems] = useState(initialItems);

    const handleRemove = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    if (items.length === 0) {
        return (
            <div className="rounded-3xl border border-[#eadfce] bg-white px-6 py-16 text-center shadow-sm">
                <div className="mb-4 text-5xl">🐾</div>
                <p className="font-medium text-[#4b3425]">ウォッチ中の商品はありません</p>
                <p className="mt-1 text-sm text-[#7a6657]">
                    商品詳細ページから「ウォッチ追加」ボタンで登録できます
                </p>
                <Link
                    href="/"
                    className="mt-6 inline-flex rounded-2xl bg-[#d98f5c] px-6 py-3 text-sm font-medium text-white hover:bg-[#c97d49]"
                >
                    商品を探す
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[#4b3425]">ウォッチリスト</h1>
                <span className="text-sm text-[#7a6657]">{items.length}件</span>
            </div>
            <div className="space-y-4">
                {items.map((item) => (
                    <WatchlistCard key={item.id} item={item} onRemove={handleRemove} />
                ))}
            </div>
        </>
    );
}
