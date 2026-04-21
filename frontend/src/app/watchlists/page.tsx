import Link from 'next/link';
import type { Metadata } from 'next';
import WatchlistCard from '@/src/components/watchlist-card';
import { getWatchlists } from '@/src/app/lib/watchlists';

export const metadata: Metadata = {
    title: 'ウォッチリスト',
};

export default async function WatchlistsPage() {
    const watchlists = await getWatchlists();

    return (
        <main className="min-h-screen bg-[#f8f4ee] px-6 py-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#4b3425]">ウォッチリスト</h1>
                    {watchlists.length > 0 && (
                        <span className="text-sm text-[#7a6657]">{watchlists.length}件</span>
                    )}
                </div>

                {watchlists.length === 0 ? (
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
                ) : (
                    <div className="space-y-4">
                        {watchlists.map((item) => (
                            <WatchlistCard key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}