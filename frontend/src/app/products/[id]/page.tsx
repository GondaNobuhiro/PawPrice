import WatchButton from '@/src/components/watch-button';
import PriceHistoryChart from '@/src/components/price-history-chart';

type PriceHistory = {
    id: string;
    price: number;
    effectivePrice: number;
    fetchedAt: string;
};

type Offer = {
    id: string;
    shopType: string;
    title: string;
    price: number;
    shippingFee: number;
    pointAmount: number;
    effectivePrice: number;
    externalUrl: string;
    sellerName: string | null;
    availabilityStatus: string | null;
    priceHistories: PriceHistory[];
};

type ProductDetail = {
    id: string;
    name: string;
    category: string;
    brand: string | null;
    petType: string;
    packageSize: string | null;
    imageUrl: string | null;
    description: string | null;
    offers: Offer[];
};

async function getProduct(id: string): Promise<ProductDetail> {
    const res = await fetch(`http://localhost:3000/api/products/${id}`, {
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error('商品詳細の取得に失敗しました');
    }

    return res.json();
}

function petTypeLabel(petType: string): string {
    switch (petType) {
        case 'dog':
            return '犬';
        case 'cat':
            return '猫';
        default:
            return petType;
    }
}

function formatCurrency(value: number): string {
    return `¥${value.toLocaleString()}`;
}

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export default async function ProductDetailPage({ params }: Props) {
    const { id } = await params;
    const product = await getProduct(id);
    const lowestOffer = product.offers[0] ?? null;

    return (
        <main className="min-h-screen bg-[#f8f4ee] px-6 py-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
                    <div className="grid gap-6 md:grid-cols-[180px_1fr]">
                        <div className="flex items-start justify-center">
                            {product.imageUrl ? (
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="h-44 w-44 rounded-xl border object-contain bg-white p-2"
                                />
                            ) : (
                                <div className="flex h-44 w-44 items-center justify-center rounded-xl border bg-gray-100 text-sm text-gray-400">
                                    画像なし
                                </div>
                            )}
                        </div>

                        <div>
                            <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  {product.category}
                </span>
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  {petTypeLabel(product.petType)}
                </span>
                            </div>

                            <h1 className="mb-4 text-2xl font-bold text-gray-900 md:text-3xl">
                                {product.name}
                            </h1>

                            <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                                {product.brand && <div>ブランド: {product.brand}</div>}
                                {product.packageSize && <div>内容量: {product.packageSize}</div>}
                            </div>

                            {product.description && (
                                <p className="mt-4 text-sm leading-7 text-gray-700">
                                    {product.description}
                                </p>
                            )}

                            <div className="mt-5">
                                <WatchButton productId={product.id} />
                            </div>
                        </div>
                    </div>
                </section>

                {lowestOffer && (
                    <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold text-gray-900">最安ショップ</h2>
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                {lowestOffer.shopType}
              </span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                            <div>
                                <div className="mb-2 text-sm text-gray-600">
                                    {lowestOffer.sellerName ?? '-'}
                                </div>
                                <div className="text-3xl font-bold text-blue-700">
                                    {formatCurrency(lowestOffer.effectivePrice)}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                                    <span>価格 {formatCurrency(lowestOffer.price)}</span>
                                    <span>送料 {formatCurrency(lowestOffer.shippingFee)}</span>
                                    <span>{lowestOffer.pointAmount.toLocaleString()}pt</span>
                                </div>
                            </div>

                            <a
                                href={lowestOffer.externalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white"
                            >
                                商品ページを見る
                            </a>
                        </div>
                    </section>
                )}

                <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
                    <PriceHistoryChart offers={product.offers} />
                </section>

                <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">ショップ比較</h2>
                        <span className="text-sm text-gray-500">{product.offers.length}件</span>
                    </div>

                    {product.offers.length === 0 ? (
                        <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-500">
                            オファー情報がありません
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {product.offers.map((offer, index) => {
                                const isLowest = index === 0;

                                return (
                                    <div
                                        key={offer.id}
                                        className={`rounded-2xl border p-4 ${
                                            isLowest ? 'border-blue-200 bg-blue-50' : 'bg-white'
                                        }`}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                                    <div className="font-semibold text-gray-900">
                                                        {offer.shopType}
                                                    </div>
                                                    {isLowest && (
                                                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                              最安
                            </span>
                                                    )}
                                                </div>

                                                <div className="text-sm text-gray-600">
                                                    {offer.sellerName ?? '-'}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {formatCurrency(offer.effectivePrice)}
                                                </div>
                                                <div className="mt-1 text-xs text-gray-500">
                                                    価格 {formatCurrency(offer.price)} / 送料{' '}
                                                    {formatCurrency(offer.shippingFee)} /{' '}
                                                    {offer.pointAmount.toLocaleString()}pt
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-wrap gap-3">
                                            <a
                                                href={offer.externalUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm text-gray-700"
                                            >
                                                商品ページを見る
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}