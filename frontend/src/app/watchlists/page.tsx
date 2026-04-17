import Link from 'next/link';
import UnwatchButton from '@/src/components/unwatch-button';
import WatchConditionForm from '@/src/components/watch-condition-form';

type WatchlistItem = {
    id: string;
    createdAt: string;
    product: {
        id: string;
        name: string;
        category: string;
        brand: string | null;
        petType: string;
        packageSize: string | null;
        imageUrl: string | null;
        lowestOffer: {
            shopType: string;
            price: number;
            effectivePrice: number;
            externalUrl: string;
        } | null;
    };
};

async function getWatchlists(): Promise<WatchlistItem[]> {
    const res = await fetch('http://localhost:3000/api/watchlists', {
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error('ウォッチリストの取得に失敗しました');
    }

    return res.json();
}

export default async function WatchlistsPage() {
    const watchlists = await getWatchlists();

    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-5xl">
                <h1 className="mb-6 text-3xl font-bold">ウォッチリスト</h1>

                <div className="grid gap-4">
                    {watchlists.map((item) => (
                        <div
                            key={item.id}
                            className="rounded-xl border bg-white p-4 shadow-sm"
                        >
                            <Link
                                href={`/products/${item.product.id}`}
                                className="mb-2 block text-xl font-semibold text-blue-600 underline"
                            >
                                {item.product.name}
                            </Link>

                            <div className="text-sm text-gray-600">
                                カテゴリ: {item.product.category}
                            </div>
                            <div className="text-sm text-gray-600">
                                ブランド: {item.product.brand ?? '未設定'}
                            </div>

                            {item.product.lowestOffer && (
                                <div className="mt-3 rounded-lg bg-blue-50 p-3">
                                    <div>最安ショップ: {item.product.lowestOffer.shopType}</div>
                                    <div>
                                        実質価格: ¥
                                        {item.product.lowestOffer.effectivePrice.toLocaleString()}
                                    </div>
                                    <a
                                        href={item.product.lowestOffer.externalUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-2 inline-block text-blue-600 underline"
                                    >
                                        商品ページを見る
                                    </a>
                                </div>
                            )}
                            <UnwatchButton productId={item.product.id} />
                            <WatchConditionForm productId={item.product.id} />
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}