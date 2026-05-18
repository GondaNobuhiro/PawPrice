import type { Metadata } from 'next';
import WatchlistList from '@/src/components/watchlist-list';
import { getWatchlists } from '@/src/app/lib/watchlists';

export const metadata: Metadata = {
    title: 'ウォッチリスト',
};

export default async function WatchlistsPage() {
    const watchlists = await getWatchlists();

    return (
        <main className="min-h-screen bg-[#f0f9ff] px-6 py-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <WatchlistList initialItems={watchlists} />
            </div>
        </main>
    );
}