import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import WatchButton from '@/src/components/watch-button';
import OfferCard from '@/src/components/offer-card';
import { getProduct } from '@/src/app/lib/products';

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

function formatShipping(fee: number | null): string {
    if (fee === null) return '送料別';
    if (fee === 0) return '送料無料';
    return `送料 ${formatCurrency(fee)}`;
}

type Props = {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ from?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
    const { id } = await params;
    const product = await getProduct(id);
    if (!product) return { title: '商品が見つかりません' };
    return {
        title: product.name,
        description: `${product.name}の価格比較。${product.offers.length}ショップの最安値・ポイント還元・送料を確認できます。`,
        openGraph: {
            title: product.name,
            description: `最安値 ¥${product.offers[0]?.effectivePrice.toLocaleString() ?? '-'}`,
            images: product.imageUrl ? [{ url: product.imageUrl }] : [],
        },
    };
}

export default async function ProductDetailPage({ params, searchParams }: Props) {
    const [{ id }, { from }] = await Promise.all([params, searchParams]);
    const product = await getProduct(id);
    if (!product) notFound();
    const lowestOffer = product.offers[0] ?? null;
    const backHref = from ? decodeURIComponent(from) : '/';

    return (
        <main className="min-h-screen bg-[#f8f4ee] px-6 py-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <div>
                    <Link
                        href={backHref}
                        className="inline-flex items-center gap-1 rounded-xl border border-[#eadfce] bg-white px-4 py-2 text-sm text-[#7a6657] transition hover:bg-[#f5e8d8]"
                    >
                        ← 一覧に戻る
                    </Link>
                </div>

                <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
                    <div className="grid gap-6 md:grid-cols-[180px_1fr]">
                        <div className="flex items-start justify-center">
                            {product.imageUrl ? (
                                <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    width={176}
                                    height={176}
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
                                <div className="text-xs text-gray-500">実質価格</div>
                                <div className="text-3xl font-bold text-blue-700">
                                    {formatCurrency(lowestOffer.effectivePrice)}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                                    <span>価格 {formatCurrency(lowestOffer.price)}</span>
                                    {lowestOffer.pointAmount > 0 && (
                                        <span className="text-orange-600">− ポイント還元 {formatCurrency(lowestOffer.pointAmount)}</span>
                                    )}
                                    <span>{formatShipping(lowestOffer.shippingFee)}</span>
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
                            {product.offers.map((offer, index) => (
                                <OfferCard key={offer.id} offer={offer} isLowest={index === 0} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}