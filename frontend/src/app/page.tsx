import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Search, ShoppingBag, Bell, BarChart2, Tag, Truck, ArrowUpRight, X } from 'lucide-react';
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
        target: { '@type': 'EntryPoint', urlTemplate: `${BASE_URL}/?q={search_term_string}` },
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                <img src="/image/icon/dogs.jpg" alt="" width={14} height={14} className="rounded-sm object-contain" />
                犬
            </span>
        );
    }
    if (petType === 'cat') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
                <img src="/image/icon/cats.jpg" alt="" width={14} height={14} className="rounded-sm object-contain" />
                猫
            </span>
        );
    }
    return (
        <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600 ring-1 ring-stone-200">
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
        <main className="min-h-screen bg-[#FAF8F4] px-4 py-6 md:px-6 md:py-8">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
            <div className="mx-auto max-w-6xl space-y-5">

                {/* ヒーローセクション */}
                {!isFiltered && page === '1' ? (
                    <section className="animate-fade-in relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#e0f2fe] to-[#bae6fd] p-8 md:p-12">
                        <div className="absolute bottom-0 right-0 top-0 hidden w-[420px] overflow-hidden rounded-r-2xl md:block">
                            <Image
                                src="/image/dogs-with-bowl.jpeg"
                                alt="ペット用品"
                                fill
                                className="object-cover object-center"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#e0f2fe] via-[#e0f2fe]/30 to-transparent" />
                        </div>
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(14,165,233,0.1),transparent_60%)]" />

                        <div className="relative z-10 max-w-xl">
                            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-200/60 px-3 py-1.5 text-xs font-medium text-[#0369a1]">
                                <span className="animate-pulse-soft h-1.5 w-1.5 rounded-full bg-[#EA580C]" />
                                Dog &amp; Cat Price Watch
                            </div>

                            <h1 className="mb-4 text-4xl font-bold leading-tight tracking-tight text-[#0c4a6e] md:text-5xl">
                                ペット用品の<br />
                                <span className="text-[#EA580C]">最安値</span>を比較
                            </h1>

                            <p className="mb-7 text-sm leading-7 text-[#0369a1]">
                                犬・猫用品をショップ横断で比較。ポイント還元込みの実質価格と<br className="hidden md:block" />
                                価格推移をいつでもチェックできます。
                            </p>

                            <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {[
                                    { icon: <ShoppingBag className="h-3.5 w-3.5" />, label: '横断比較' },
                                    { icon: <BarChart2 className="h-3.5 w-3.5" />, label: '価格推移' },
                                    { icon: <Tag className="h-3.5 w-3.5" />, label: 'ポイント還元' },
                                    { icon: <Bell className="h-3.5 w-3.5" />, label: '値下がり通知' },
                                ].map(({ icon, label }) => (
                                    <div
                                        key={label}
                                        className="flex items-center gap-1.5 rounded-xl border border-sky-300 bg-white/40 px-3 py-2.5 text-xs font-medium text-[#0369a1]"
                                    >
                                        {icon}
                                        {label}
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                <div className="text-sm text-[#0369a1]">
                                    <span className="font-display text-2xl font-normal text-[#0c4a6e]">
                                        {pagination.totalCount.toLocaleString()}
                                    </span>
                                    {' '}商品を比較中
                                </div>
                                <PushSubscribeButton />
                            </div>
                        </div>
                    </section>
                ) : null}

                {/* 検索フォーム */}
                <section className="rounded-2xl border border-[#E7E5E4] bg-white p-4 shadow-sm">
                    <form>
                        <div className="grid gap-3 md:grid-cols-[1fr_150px_150px_120px]">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8A29E]" />
                                <input
                                    type="text"
                                    name="q"
                                    defaultValue={q}
                                    placeholder="商品名で検索（例: ロイヤルカナン）"
                                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#FAF8F4] py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-[#C4BAB4] focus:border-[#EA580C] focus:bg-white focus:ring-2 focus:ring-[#EA580C]/10"
                                />
                            </div>

                            <select
                                name="petType"
                                defaultValue={petType}
                                className="rounded-xl border border-[#E7E5E4] bg-[#FAF8F4] px-3 py-2.5 text-sm text-[#57534E] outline-none transition focus:border-[#EA580C] focus:bg-white"
                            >
                                <option value="">🐾 すべて</option>
                                <option value="dog">🐕 犬</option>
                                <option value="cat">🐈 猫</option>
                            </select>

                            <select
                                name="sort"
                                defaultValue={sort}
                                className="rounded-xl border border-[#E7E5E4] bg-[#FAF8F4] px-3 py-2.5 text-sm text-[#57534E] outline-none transition focus:border-[#EA580C] focus:bg-white"
                            >
                                <option value="newest">新着順</option>
                                <option value="price_asc">安い順</option>
                                <option value="price_down">値下がり中</option>
                            </select>

                            <button
                                type="submit"
                                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#EA580C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#C2410C] active:scale-[0.98]"
                            >
                                <Search className="h-3.5 w-3.5" />
                                検索
                            </button>
                        </div>
                    </form>
                    {isFiltered && (
                        <div className="mt-3 flex justify-end">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-1 text-xs text-[#A8A29E] transition hover:text-[#EA580C]"
                            >
                                <X className="h-3 w-3" />
                                フィルターをクリア
                            </Link>
                        </div>
                    )}
                </section>

                {/* カテゴリ・フィルター */}
                <section className="rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-sm">
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
                    <section className="rounded-2xl border border-[#E7E5E4] bg-white p-12 text-center shadow-sm">
                        <div className="mb-6 flex justify-center">
                            <div className="relative h-44 w-64 overflow-hidden rounded-2xl shadow-sm">
                                <Image
                                    src="/image/dogs-playing.jpeg"
                                    alt="ポメラニアン"
                                    fill
                                    className="object-cover"
                                    style={{ objectPosition: '70% 40%', transform: 'scale(1.8)', transformOrigin: '70% 40%' }}
                                />
                            </div>
                        </div>
                        <p className="font-semibold text-[#1C1917]">条件に一致する商品はありません</p>
                        <p className="mt-1.5 text-sm text-[#A8A29E]">検索条件を変えてお試しください</p>
                    </section>
                ) : (
                    <>
                        <div className="grid gap-4">
                            {products.map((product, index) => (
                                <article
                                    key={product.id}
                                    className={`group animate-fade-up overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                                        product.priceSummary?.isPriceDown
                                            ? 'border-rose-200'
                                            : 'border-[#E7E5E4]'
                                    }`}
                                    style={{ animationDelay: `${index * 55}ms` }}
                                >
                                    {product.priceSummary?.isPriceDown && (
                                        <div className="h-0.5 w-full bg-gradient-to-r from-rose-500 via-rose-400 to-transparent" />
                                    )}

                                    <div className="grid gap-5 p-5 md:grid-cols-[160px_1fr]">
                                        <div className="flex items-start justify-center">
                                            {product.imageUrl ? (
                                                <Image
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    width={152}
                                                    height={152}
                                                    className="h-38 w-38 rounded-xl border border-[#F0EDE8] bg-[#FAF8F4] object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="flex h-38 w-38 items-center justify-center rounded-xl border border-[#F0EDE8] bg-[#FAF8F4] text-2xl">
                                                    🐾
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-[#F5F4F3] px-2.5 py-1 text-xs font-medium text-[#57534E]">
                                                    <Tag className="h-3 w-3" />
                                                    {product.category}
                                                </span>

                                                <PetTypeBadge petType={product.petType} />

                                                {product.priceSummary?.isPriceDown && (
                                                    <span className="animate-badge-pop inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-600 ring-1 ring-sky-200">
                                                        <img src="/image/icon/price-drops.jpg" alt="" width={14} height={14} className="rounded-sm object-contain" />
                                                        値下がり中
                                                    </span>
                                                )}
                                            </div>

                                            <Link
                                                href={`/products/${product.id}?from=${encodeURIComponent(fromUrl)}`}
                                                className="mb-3 block text-lg font-semibold leading-7 text-[#1C1917] transition-colors hover:text-[#EA580C]"
                                            >
                                                {product.name}
                                            </Link>

                                            {(product.brand || product.packageSize || product.subCategory) && (
                                                <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#A8A29E]">
                                                    {product.brand && <span>ブランド: {product.brand}</span>}
                                                    {product.packageSize && <span>内容量: {product.packageSize}</span>}
                                                    {product.subCategory && <span>小分類: {product.subCategory}</span>}
                                                </div>
                                            )}

                                            <div className="mb-4 flex flex-wrap gap-3">
                                                {product.priceSummary?.latestEffectivePrice != null && (
                                                    <div className="rounded-xl border border-[#F0EDE8] bg-[#FAF8F4] px-4 py-2.5">
                                                        <div className="text-[11px] font-medium uppercase tracking-wider text-[#A8A29E]">
                                                            現在の最安値
                                                        </div>
                                                        <div className="font-display mt-0.5 text-2xl text-[#92400E]">
                                                            ¥{product.priceSummary.latestEffectivePrice.toLocaleString()}
                                                        </div>
                                                    </div>
                                                )}
                                                {product.priceSummary?.historicalMinPrice != null && (
                                                    <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-2.5">
                                                        <div className="text-[11px] font-medium uppercase tracking-wider text-amber-500">
                                                            過去最安値
                                                        </div>
                                                        <div className="font-display mt-0.5 text-2xl text-amber-700">
                                                            ¥{product.priceSummary.historicalMinPrice.toLocaleString()}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {product.lowestOffer ? (
                                                <div className="rounded-xl border border-[#E7E5E4] bg-[#FAF8F4] p-4">
                                                    <div className="mb-3 flex items-center gap-2">
                                                        <ShoppingBag className="h-3.5 w-3.5 text-[#A8A29E]" />
                                                        <div className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E]">
                                                            最安ショップ
                                                        </div>
                                                    </div>

                                                    <div className="mb-4">
                                                        <div className="text-xs text-[#A8A29E]">
                                                            {product.lowestOffer.shopType}
                                                            {product.lowestOffer.sellerName
                                                                ? ` / ${product.lowestOffer.sellerName}`
                                                                : ''}
                                                        </div>
                                                        <div className="font-display mt-1 text-3xl text-[#EA580C]">
                                                            ¥{product.lowestOffer.effectivePrice.toLocaleString()}
                                                        </div>
                                                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                            {product.lowestOffer.pointAmount > 0 && (
                                                                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                                                                    Pt還元 ¥{product.lowestOffer.pointAmount.toLocaleString()}
                                                                </span>
                                                            )}
                                                            {product.lowestOffer.shippingFee === null && (
                                                                <span className="flex items-center gap-0.5 text-[11px] text-[#A8A29E]">
                                                                    <Truck className="h-3 w-3" />
                                                                    送料別
                                                                </span>
                                                            )}
                                                            {product.lowestOffer.shippingFee === 0 && (
                                                                <span className="flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
                                                                    <Truck className="h-3 w-3" />
                                                                    送料無料
                                                                </span>
                                                            )}
                                                            <span className="text-[11px] text-[#C4BAB4]">
                                                                更新: {formatRelativeTime(product.lowestOffer.lastFetchedAt)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2.5">
                                                        <a
                                                            href={product.lowestOffer.externalUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#EA580C] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C2410C] active:scale-[0.98]"
                                                        >
                                                            商品ページを見る
                                                            <ArrowUpRight className="h-3.5 w-3.5" />
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
