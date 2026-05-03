'use client';

import { useState } from 'react';
import Image from 'next/image';
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
            <div className="rounded-3xl border border-sky-100 bg-white px-6 py-12 text-center shadow-sm">
                <div className="mb-6 flex justify-center">
                    <div className="relative h-44 w-64 overflow-hidden rounded-2xl shadow-sm">
                        <Image
                            src="/image/dog-running.jpeg"
                            alt="ポメラニアン"
                            fill
                            className="object-cover"
                            style={{ objectPosition: '30% 40%', transform: 'scale(1.6)', transformOrigin: '30% 40%' }}
                        />
                    </div>
                </div>
                <p className="font-semibold text-gray-700">ウォッチ中の商品はありません</p>
                <p className="mt-1 text-sm text-gray-400">
                    商品詳細ページから「ウォッチ追加」ボタンで登録できます
                </p>
                <Link
                    href="/"
                    className="mt-6 inline-flex rounded-2xl bg-[#f97316] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#ea580c]"
                >
                    商品を探す →
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">ウォッチリスト</h1>
                <span className="text-sm text-gray-500">{items.length}件</span>
            </div>
            <div className="space-y-4">
                {items.map((item) => (
                    <WatchlistCard key={item.id} item={item} onRemove={handleRemove} />
                ))}
            </div>
        </>
    );
}
