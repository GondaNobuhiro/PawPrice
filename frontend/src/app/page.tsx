import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import WatchButton from '@/src/components/watch-button';
import PushSubscribeButton from '@/src/components/push-subscribe-button';
import CategoryFilterChips from '@/src/components/category-filter-chips';
import SortSelect from '@/src/components/sort-select';
import PetTypeFilter from '@/src/components/pet-type-filter';
import Pagination from '@/src/components/pagination';
import { getCategories } from '@/src/app/lib/categories';
import { getProducts } from '@/src/app/lib/products';

const BASE_URL = 'https://paw-price.vercel.app';

export const metadata: Metadata = {
    alternates: { canonical: BASE_URL },
};

const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PawPrice',
    url: BASE_URL,
    description: '犬・猫用品の最安値をショップ横断で比較。価格推移・ポイント還元込みの実質価格を確認できます。',
    potentialAction: {
        '@type': 'SearchAction',
        target: {
            '@type': 'EntryPoint',
            urlTemplate: `${BASE_URL}/?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
    },
};

function formatRelativeTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    const days = Math.floor(hours / 24);
    return `${days}日前`;
}

function PetTypeBadge({ petType }: { petType: string }) {
    if (petType === 'dog') {
        return (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                🐕 犬
            </span>
        );
    }
    if (petType === 'cat') {
        return (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                🐈 猫
            </span>
        );
    }
    return (
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
            🐾 犬猫
        </span>
    );
}

type Props = {
    searchParams: Promise<{
        q?: string;
        categoryId?: string;
        sort?: string;
        petType?: string;
        page?: string;
    }>;
};

export default async function Home({ searchParams }: Props) {
    const params = await searchParams;
    const q = params.q ?? '';
    const categoryId = params.categoryId ?? '';
    const sort = params.sort ?? 'newest';
    const petType = params.petType ?? '';
    const page = params.page ?? '1';

    const [productsResponse, categories] = await Promise.all([
        getProducts({ q, categoryId, sort, petType, page }),
        getCategories(),
    ]);

    const isFiltered = q !== '' || categoryId !== '' || petType !== '' || sort !== 'newest';
    const fromParams = new URLSearchParams();
    if (q) fromParams.set('q', q);
    if (categoryId) fromParams.set('categoryId', categoryId);
    if (sort && sort !== 'newest') fromParams.set('sort', sort);
    if (petType) fromParams.set('petType', petType);
    if (page && page !== '1') fromParams.set('page', page);
    const fromUrl = fromParams.toString() ? `/?${fromParams.toString()}` : '/';

    const products = productsResponse.items;
    const pagination = productsResponse.pagination;

    return (
        <main className="min-h-screen bg-[#f0f9ff] px-6 py-8">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
            <div className="mx-auto max-w-6xl space-y-6">

                {/* ヒーローセクション（トップページのみ） */}
                {!isFiltered && page === '1' ? (
                    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0ea5e9] via-[#38bdf8] to-[#7dd3fc] p-8 text-white shadow-lg md:p-12">
                        {/* 装飾ペット絵文字 */}
                        <div className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 select-none flex-col gap-6 opacity-20 md:flex">
                            <span className="text-8xl">🐶</span>
                            <span className="text-8xl">🐱</span>
                        </div>

                        <div className="max-w-2xl">
                            <div className="mb-4 inline-flex rounded-full bg-white/25 px-3 py-1 text-xs font-semibold text-white">
                                🐾 Dog &amp; Cat Price Watch
                            </div>
                            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
                                ペット用品の<br />最安値を比較
                            </h1>
                            <p className="mb-6 text-lg text-white/90">
                                犬・猫用品をショップ横断で比較。ポイント還元込みの実質価格と価格推移をチェックできます。
                            </p>
                            <div className="mb-6 flex flex-wrap gap-2">
                                <span className="rounded-full bg-white/20 px-3 py-1.5 text-sm">🔍 複数ショップを横断比較</span>
                                <span className="rounded-full bg-white/20 px-3 py-1.5 text-sm">📊 価格推移グラフ</span>
                                <span className="rounded-full bg-white/20 px-3 py-1.5 text-sm">💰 ポイント還元込み実質価格</span>
                                <span className="rounded-full bg-white/20 px-3 py-1.5 text-sm">🔔 値下がり通知</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="text-sm text-white/80">
                                    <span className="text-2xl font-bold text-white">{pagination.totalCount.toLocaleString()}</span> 商品を比較中
                                </div>
                                <PushSubscribeButton />
                            </div>
                        </div>
                    </section>
                ) : null}

                {/* 検索フォーム */}
                <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
                    <form>
                        <div className="grid gap-4 md:grid-cols-[1fr_160px_160px_140px]">
                            <div className="relative">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    🔍
                                </span>
                                <input
                                    type="text"
                                    name="q"
                                    defaultValue={q}
                                    placeholder="商品名で検索（例: ロイヤルカナン）"
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-sky-400 focus:bg-white"
                                />
                            </div>

                            <select
                                name="petType"
                                defaultValue={petType}
                                className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                            >
                                <option value="">🐾 すべて</option>
                                <option value="dog">🐕 犬</option>
                                <option value="cat">🐈 猫</option>
                            </select>

                            <select
                                name="sort"
                                defaultValue={sort}
                                className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                            >
                                <option value="newest">新着順</option>
                                <option value="price_asc">安い順</option>
                                <option value="price_down">値下がり中</option>
                            </select>

                            <button
                                type="submit"
                                className="rounded-2xl bg-[#f97316] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
                            >
                                検索
                            </button>
                        </div>
                    </form>
                    {isFiltered && (
                        <div className="mt-3 flex justify-end">
                            <Link
                                href="/"
                                className="text-sm text-sky-600 underline hover:text-sky-800"
                            >
                                × フィルターをクリア
                            </Link>
                        </div>
                    )}
                </section>

                {/* カテゴリ・フィルター */}
                <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-sm">
                    <CategoryFilterChips
                        categories={categories}
                        selectedCategoryId={categoryId}
                        q={q}
                        sort={sort}
                        petType={petType}
                    />

                    <PetTypeFilter
                        q={q}
                        categoryId={categoryId}
                        sort={sort}
                        selectedPetType={petType}
                    />

                    <SortSelect
                        q={q}
                        categoryId={categoryId}
                        petType={petType}
                        selectedSort={sort}
                        totalCount={pagination.totalCount}
                    />
                </section>

                {products.length === 0 ? (
                    <section className="rounded-3xl border border-sky-100 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
                        条件に一致する商品はありません 🐾
                    </section>
                ) : (
                    <>
                        <div className="grid gap-5">
                            {products.map((product) => (
                                <article
                                    key={product.id}
                                    className={`rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                        product.priceSummary?.isPriceDown
                                            ? 'border-rose-200'
                                            : 'border-sky-100'
                                    }`}
                                >
                                    <div className="grid gap-5 md:grid-cols-[170px_1fr]">
                                        <div className="flex items-start justify-center">
                                            {product.imageUrl ? (
                                                <Image
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    width={160}
                                                    height={160}
                                                    className="h-40 w-40 rounded-2xl border border-sky-100 bg-sky-50 object-contain p-3"
                                                />
                                            ) : (
                                                <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sm text-gray-400">
                                                    🐾
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="mb-3 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                                                    {product.category}
                                                </span>

                                                <PetTypeBadge petType={product.petType} />

                                                {product.priceSummary?.isPriceDown && (
                                                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
                                                        🔻 値下がり中
                                                    </span>
                                                )}
                                            </div>

                                            <Link
                                                href={`/products/${product.id}?from=${encodeURIComponent(fromUrl)}`}
                                                className="mb-3 block text-xl font-semibold leading-8 text-gray-800 transition hover:text-[#0ea5e9]"
                                            >
                                                {product.name}
                                            </Link>

                                            {(product.brand || product.packageSize || product.subCategory) && (
                                                <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                                    {product.brand && <div>ブランド: {product.brand}</div>}
                                                    {product.packageSize && (
                                                        <div>内容量: {product.packageSize}</div>
                                                    )}
                                                    {product.subCategory && (
                                                        <div>小分類: {product.subCategory}</div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="mb-4 flex flex-wrap gap-3">
                                                {product.priceSummary?.latestEffectivePrice != null && (
                                                    <div className="rounded-2xl bg-sky-50 px-4 py-3">
                                                        <div className="text-xs text-gray-500">現在の最安値</div>
                                                        <div className="text-2xl font-bold text-gray-800">
                                                            ¥{product.priceSummary.latestEffectivePrice.toLocaleString()}
                                                        </div>
                                                    </div>
                                                )}
                                                {product.priceSummary?.historicalMinPrice != null && (
                                                    <div className="rounded-2xl bg-amber-50 px-4 py-3">
                                                        <div className="text-xs text-amber-600">過去最安値</div>
                                                        <div className="text-2xl font-bold text-amber-700">
                                                            ¥{product.priceSummary.historicalMinPrice.toLocaleString()}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {product.lowestOffer ? (
                                                <div className="rounded-3xl border border-sky-100 bg-sky-50 p-4">
                                                    <div className="mb-2 text-sm font-semibold text-gray-600">
                                                        🛒 最安ショップ
                                                    </div>

                                                    <div className="mb-3 flex flex-wrap items-end gap-3">
                                                        <div>
                                                            <div className="text-sm text-gray-500">
                                                                {product.lowestOffer.shopType}
                                                                {product.lowestOffer.sellerName
                                                                    ? ` / ${product.lowestOffer.sellerName}`
                                                                    : ''}
                                                            </div>
                                                            <div className="mt-1 text-3xl font-bold text-[#f97316]">
                                                                ¥{product.lowestOffer.effectivePrice.toLocaleString()}
                                                            </div>
                                                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                                                                {product.lowestOffer.pointAmount > 0 && (
                                                                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-700">
                                                                        ポイント還元 ¥{product.lowestOffer.pointAmount.toLocaleString()}
                                                                    </span>
                                                                )}
                                                                {product.lowestOffer.shippingFee === null && (
                                                                    <span>送料別</span>
                                                                )}
                                                                {product.lowestOffer.shippingFee === 0 && (
                                                                    <span className="text-green-600">✓ 送料無料</span>
                                                                )}
                                                                <span>更新: {formatRelativeTime(product.lowestOffer.lastFetchedAt)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-3">
                                                        <a
                                                            href={product.lowestOffer.externalUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center justify-center rounded-2xl bg-[#f97316] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
                                                        >
                                                            商品ページを見る →
                                                        </a>

                                                        <WatchButton productId={product.id} />
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <Pagination
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            q={q}
                            categoryId={categoryId}
                            sort={sort}
                            petType={petType}
                        />
                    </>
                )}
            </div>
        </main>
    );
}
