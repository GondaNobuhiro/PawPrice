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

function petTypeLabel(type: string) {
    if (type === 'dog') return '犬';
    if (type === 'cat') return '猫';
    return type;
}

function formatRelativeTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    const days = Math.floor(hours / 24);
    return `${days}日前`;
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
        <main className="min-h-screen bg-[#f8f4ee] px-6 py-8">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
            <div className="mx-auto max-w-6xl space-y-6">

                {/* ヒーローセクション（トップページのみ） */}
                {!isFiltered && page === '1' ? (
                    <section className="rounded-3xl bg-gradient-to-br from-[#6b4a2a] via-[#8a6040] to-[#a67a55] p-8 text-white shadow-lg md:p-12">
                        <div className="max-w-2xl">
                            <div className="mb-4 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white/90">
                                🐾 Dog &amp; Cat Price Watch
                            </div>
                            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
                                ペット用品の<br />最安値を比較
                            </h1>
                            <p className="mb-6 text-lg text-white/80">
                                犬・猫用品をショップ横断で比較。ポイント還元込みの実質価格と価格推移をチェックできます。
                            </p>
                            <div className="mb-6 flex flex-wrap gap-2">
                                <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm">🔍 複数ショップを横断比較</span>
                                <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm">📊 価格推移グラフ</span>
                                <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm">💰 ポイント還元込み実質価格</span>
                                <span className="rounded-full bg-white/15 px-3 py-1.5 text-sm">🔔 値下がり通知</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="text-white/70 text-sm">
                                    <span className="text-2xl font-bold text-white">{pagination.totalCount.toLocaleString()}</span> 商品を比較中
                                </div>
                                <PushSubscribeButton />
                            </div>
                        </div>
                    </section>
                ) : null}

                {/* 検索フォーム */}
                <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
                    <form>
                        <div className="grid gap-4 md:grid-cols-[1fr_160px_160px_140px]">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b49d88] pointer-events-none">
                                    🔍
                                </span>
                                <input
                                    type="text"
                                    name="q"
                                    defaultValue={q}
                                    placeholder="商品名で検索"
                                    className="w-full rounded-2xl border border-[#e6d9c8] bg-[#fffdf9] pl-10 pr-4 py-3 text-sm outline-none transition placeholder:text-[#b49d88] focus:border-[#d8b892]"
                                />
                            </div>

                            <select
                                name="petType"
                                defaultValue={petType}
                                className="rounded-2xl border border-[#e6d9c8] bg-[#fffdf9] px-4 py-3 text-sm outline-none transition focus:border-[#d8b892]"
                            >
                                <option value="">すべて</option>
                                <option value="dog">犬</option>
                                <option value="cat">猫</option>
                            </select>

                            <select
                                name="sort"
                                defaultValue={sort}
                                className="rounded-2xl border border-[#e6d9c8] bg-[#fffdf9] px-4 py-3 text-sm outline-none transition focus:border-[#d8b892]"
                            >
                                <option value="newest">新着順</option>
                                <option value="price_asc">安い順</option>
                                <option value="price_down">値下がり中</option>
                            </select>

                            <button
                                type="submit"
                                className="rounded-2xl bg-[#d98f5c] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#c97d49]"
                            >
                                検索
                            </button>
                        </div>
                    </form>
                    {isFiltered && (
                        <div className="mt-3 flex justify-end">
                            <Link
                                href="/"
                                className="text-sm text-[#9a6b3d] underline hover:text-[#c97d49]"
                            >
                                × フィルターをクリア
                            </Link>
                        </div>
                    )}
                </section>

                {/* カテゴリ・フィルター */}
                <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
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
                    <section className="rounded-3xl border border-[#eadfce] bg-white p-10 text-center text-sm text-[#8e7a6c] shadow-sm">
                        条件に一致する商品はありません
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
                                            : 'border-[#eadfce]'
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
                                                    className="h-40 w-40 rounded-2xl border border-[#efe4d7] bg-[#fffaf5] object-contain p-3"
                                                />
                                            ) : (
                                                <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-[#efe4d7] bg-[#faf5ef] text-sm text-[#baa896]">
                                                    画像なし
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="mb-3 flex flex-wrap gap-2">
                                                <span className="rounded-full bg-[#f5e8d8] px-3 py-1 text-xs font-medium text-[#8b633d]">
                                                    {product.category}
                                                </span>

                                                <span className="rounded-full bg-[#f6efe2] px-3 py-1 text-xs font-medium text-[#8d6b4f]">
                                                    {petTypeLabel(product.petType)}
                                                </span>

                                                {product.priceSummary?.isPriceDown && (
                                                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600">
                                                        ↓ 値下がり中
                                                    </span>
                                                )}
                                            </div>

                                            <Link
                                                href={`/products/${product.id}?from=${encodeURIComponent(fromUrl)}`}
                                                className="mb-3 block text-xl font-semibold leading-8 text-[#4b3425] transition hover:text-[#c97d49]"
                                            >
                                                {product.name}
                                            </Link>

                                            {(product.brand || product.packageSize || product.subCategory) && (
                                                <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#7a6657]">
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
                                                    <div className="rounded-2xl bg-[#f7f3ed] px-4 py-3">
                                                        <div className="text-xs text-[#8b7b6f]">現在の最安値</div>
                                                        <div className="text-2xl font-bold text-[#4b3425]">
                                                            ¥{product.priceSummary.latestEffectivePrice.toLocaleString()}
                                                        </div>
                                                    </div>
                                                )}
                                                {product.priceSummary?.historicalMinPrice != null && (
                                                    <div className="rounded-2xl bg-[#f5e8d8] px-4 py-3">
                                                        <div className="text-xs text-[#9a6b3d]">過去最安値</div>
                                                        <div className="text-2xl font-bold text-[#8b633d]">
                                                            ¥{product.priceSummary.historicalMinPrice.toLocaleString()}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {product.lowestOffer ? (
                                                <div className="rounded-3xl border border-[#eadfce] bg-[#fffaf3] p-4">
                                                    <div className="mb-2 text-sm font-medium text-[#7a6657]">
                                                        最安ショップ
                                                    </div>

                                                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                                                        <div>
                                                            <div className="text-sm text-[#7a6657]">
                                                                {product.lowestOffer.shopType}
                                                                {product.lowestOffer.sellerName
                                                                    ? ` / ${product.lowestOffer.sellerName}`
                                                                    : ''}
                                                            </div>
                                                            <div className="mt-1 text-3xl font-bold text-[#c97d49]">
                                                                ¥{product.lowestOffer.effectivePrice.toLocaleString()}
                                                            </div>
                                                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#9f8d80]">
                                                                {product.lowestOffer.pointAmount > 0 && (
                                                                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-700">
                                                                        ポイント還元 ¥{product.lowestOffer.pointAmount.toLocaleString()}
                                                                    </span>
                                                                )}
                                                                {product.lowestOffer.shippingFee === null && (
                                                                    <span>送料別</span>
                                                                )}
                                                                {product.lowestOffer.shippingFee === 0 && (
                                                                    <span className="text-green-700">送料無料</span>
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
                                                            className="inline-flex items-center justify-center rounded-2xl bg-[#d98f5c] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#c97d49]"
                                                        >
                                                            商品ページを見る
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
