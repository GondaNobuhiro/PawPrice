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

type Props = {
    params: Promise<{
        id: string;
    }>;
};

function petTypeLabel(petType: string): string {
    switch (petType) {
        case 'dog':
            return '犬';
        case 'cat':
            return '猫';
        case 'both':
            return '犬・猫';
        default:
            return petType;
    }
}

export default async function ProductDetailPage({ params }: Props) {
    const { id } = await params;
    const product = await getProduct(id);
    const lowestOffer = product.offers[0] ?? null;

    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-5xl">
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                    <div className="grid gap-6 md:grid-cols-[180px_1fr]">
                        <div className="flex items-start justify-center">
                            {product.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
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

                            <h1 className="mb-4 text-3xl font-bold">{product.name}</h1>

                            <div className="space-y-1 text-sm text-gray-600">
                                <div>ブランド: {product.brand ?? '未設定'}</div>
                                <div>内容量: {product.packageSize ?? '-'}</div>
                            </div>

                            {product.description && (
                                <p className="mt-4 text-gray-800">{product.description}</p>
                            )}

                            <div className="mt-5">
                                <WatchButton productId={product.id} />
                            </div>
                        </div>
                    </div>
                </div>

                {lowestOffer && (
                    <div className="mt-6 rounded-2xl border-2 border-blue-300 bg-blue-50 p-6 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                最安オファー
              </span>
                            <span className="text-sm text-blue-800">
                {lowestOffer.shopType}
                                {lowestOffer.sellerName ? ` / ${lowestOffer.sellerName}` : ''}
              </span>
                        </div>

                        <div className="mb-3 text-lg font-semibold text-gray-900">
                            {lowestOffer.title}
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                            <div className="rounded-xl bg-white p-4 shadow-sm">
                                <div className="text-xs text-gray-500">販売価格</div>
                                <div className="mt-1 text-xl font-semibold text-gray-800">
                                    ¥{lowestOffer.price.toLocaleString()}
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-4 shadow-sm">
                                <div className="text-xs text-gray-500">送料</div>
                                <div className="mt-1 text-xl font-semibold text-gray-800">
                                    ¥{lowestOffer.shippingFee.toLocaleString()}
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-4 shadow-sm">
                                <div className="text-xs text-gray-500">ポイント</div>
                                <div className="mt-1 text-xl font-semibold text-gray-800">
                                    {lowestOffer.pointAmount.toLocaleString()}pt
                                </div>
                            </div>

                            <div className="rounded-xl bg-blue-600 p-4 text-white shadow-sm">
                                <div className="text-xs text-blue-100">実質価格</div>
                                <div className="mt-1 text-3xl font-bold">
                                    ¥{lowestOffer.effectivePrice.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <a
                            href={lowestOffer.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white"
                        >
                            最安ショップで商品を見る
                        </a>
                    </div>
                )}

                <div className="mt-6">
                    <PriceHistoryChart offers={product.offers} />
                </div>

                <div className="mt-6 grid gap-4">
                    {product.offers.map((offer) => {
                        const isLowest = lowestOffer?.id === offer.id;

                        return (
                            <div
                                key={offer.id}
                                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                                    isLowest ? 'border-blue-300 ring-2 ring-blue-100' : ''
                                }`}
                            >
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    {isLowest && (
                                        <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                      最安
                    </span>
                                    )}
                                    <div className="text-xl font-semibold">{offer.shopType}</div>
                                    {offer.sellerName && (
                                        <div className="text-sm text-gray-500">
                                            / {offer.sellerName}
                                        </div>
                                    )}
                                </div>

                                <div className="text-sm text-gray-600">{offer.title}</div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-xl bg-gray-50 p-3">
                                        <div className="text-xs text-gray-500">価格</div>
                                        <div className="mt-1 text-lg font-semibold text-gray-800">
                                            ¥{offer.price.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-gray-50 p-3">
                                        <div className="text-xs text-gray-500">送料</div>
                                        <div className="mt-1 text-lg font-semibold text-gray-800">
                                            ¥{offer.shippingFee.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-gray-50 p-3">
                                        <div className="text-xs text-gray-500">ポイント</div>
                                        <div className="mt-1 text-lg font-semibold text-gray-800">
                                            {offer.pointAmount.toLocaleString()}pt
                                        </div>
                                    </div>

                                    <div
                                        className={`rounded-xl p-3 ${
                                            isLowest ? 'bg-blue-100' : 'bg-gray-50'
                                        }`}
                                    >
                                        <div className="text-xs text-gray-500">実質価格</div>
                                        <div
                                            className={`mt-1 text-xl font-bold ${
                                                isLowest ? 'text-blue-700' : 'text-gray-800'
                                            }`}
                                        >
                                            ¥{offer.effectivePrice.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <a
                                    href={offer.externalUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-block text-blue-600 underline"
                                >
                                    ショップで見る
                                </a>

                                <div className="mt-4">
                                    <div className="mb-2 font-medium">価格履歴</div>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        {offer.priceHistories.map((history) => (
                                            <div key={history.id}>
                                                {new Date(history.fetchedAt).toLocaleString('ja-JP')} / ¥
                                                {history.effectivePrice.toLocaleString()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
}