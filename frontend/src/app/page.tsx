import Link from 'next/link';
import WatchButton from '@/src/components/watch-button';
import PushSubscribeButton from '@/src/components/push-subscribe-button';
import CategoryFilterChips from '@/src/components/category-filter-chips';
import SortSelect from '@/src/components/sort-select';
import PetTypeFilter from '@/src/components/pet-type-filter';
import Pagination from '@/src/components/pagination';

type ProductResponse = {
    id: string;
    name: string;
    category: string;
    categoryCode: string;
    brand: string | null;
    petType: string;
    packageSize: string | null;
    imageUrl: string | null;
    createdAt: string;
    offersCount: number;
    lowestOffer: {
        shopType: string;
        sellerName: string | null;
        title: string;
        price: number;
        shippingFee: number;
        pointAmount: number;
        effectivePrice: number;
        externalUrl: string;
    } | null;
    priceSummary: {
        latestEffectivePrice: number | null;
        historicalMinPrice: number | null;
        latestDiffFromPrevious: number | null;
        isPriceDown: boolean;
    };
};

type Category = {
    id: string;
    code: string;
    name: string;
};

type ProductsApiResponse = {
    items: ProductResponse[];
    pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasPreviousPage: boolean;
        hasNextPage: boolean;
    };
};

function petTypeLabel(type: string) {
    if (type === 'dog') return '犬';
    if (type === 'cat') return '猫';
    return type;
}

async function getProducts(
    q?: string,
    category?: string,
    sort?: string,
    petType?: string,
    page?: string,
): Promise<ProductsApiResponse> {
    const params = new URLSearchParams();

    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (sort) params.set('sort', sort);
    if (petType) params.set('petType', petType);
    if (page) params.set('page', page);

    const query = params.toString();
    const url = query
        ? `http://localhost:3000/api/products?${query}`
        : 'http://localhost:3000/api/products';

    const res = await fetch(url, {
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error('商品の取得に失敗しました');
    }

    return res.json();
}

async function getCategories(): Promise<Category[]> {
    const res = await fetch('http://localhost:3000/api/categories', {
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error('カテゴリの取得に失敗しました');
    }

    return res.json();
}

type Props = {
    searchParams: Promise<{
        q?: string;
        category?: string;
        sort?: string;
        petType?: string;
        page?: string;
    }>;
};

export default async function Home({ searchParams }: Props) {
    const params = await searchParams;
    const q = params.q ?? '';
    const category = params.category ?? '';
    const sort = params.sort ?? 'newest';
    const petType = params.petType ?? '';
    const page = params.page ?? '1';

    const [productsResponse, categories] = await Promise.all([
        getProducts(q, category, sort, petType, page),
        getCategories(),
    ]);

    const products = productsResponse.items;
    const pagination = productsResponse.pagination;

    return (
        <main className="min-h-screen bg-[#f8f4ee] px-6 py-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <section className="rounded-3xl border border-[#eadfce] bg-[#fffaf3] p-6 shadow-sm">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="mb-2 inline-flex rounded-full bg-[#f4e6d2] px-3 py-1 text-xs font-medium text-[#9a6b3d]">
                                Dog & Cat Price Watch
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-[#4b3425]">
                                PawPrice
                            </h1>
                            <p className="mt-2 text-sm text-[#7a6657]">
                                ペット用品の価格を、やさしく見やすく比較
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <PushSubscribeButton />
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
                    <form>
                        <div className="grid gap-4 md:grid-cols-[1fr_220px_160px_160px_140px]">
                            <input
                                type="text"
                                name="q"
                                defaultValue={q}
                                placeholder="商品名で検索"
                                className="rounded-2xl border border-[#e6d9c8] bg-[#fffdf9] px-4 py-3 text-sm outline-none transition placeholder:text-[#b49d88] focus:border-[#d8b892]"
                            />

                            <select
                                name="category"
                                defaultValue={category}
                                className="rounded-2xl border border-[#e6d9c8] bg-[#fffdf9] px-4 py-3 text-sm outline-none transition focus:border-[#d8b892]"
                            >
                                <option value="">カテゴリ</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.code}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>

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
                            </select>

                            <button
                                type="submit"
                                className="rounded-2xl bg-[#d98f5c] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#c97d49]"
                            >
                                検索
                            </button>
                        </div>
                    </form>
                </section>

                <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
                    <CategoryFilterChips
                        categories={categories}
                        selectedCategory={category}
                        q={q}
                        sort={sort}
                        petType={petType}
                    />

                    <PetTypeFilter
                        q={q}
                        category={category}
                        sort={sort}
                        selectedPetType={petType}
                    />

                    <SortSelect
                        q={q}
                        category={category}
                        petType={petType}
                        selectedSort={sort}
                    />
                </section>

                <div className="flex items-center justify-between">
                    <div className="text-sm text-[#7a6657]">
            <span className="font-medium text-[#5c4331]">
              {pagination.totalCount}
            </span>{' '}
                        件
                    </div>
                </div>

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
                                    className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm transition hover:shadow-md"
                                >
                                    <div className="grid gap-5 md:grid-cols-[170px_1fr]">
                                        <div className="flex items-start justify-center">
                                            {product.imageUrl ? (
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
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

                                                {product.priceSummary.isPriceDown && (
                                                    <span className="rounded-full bg-[#e5f3e8] px-3 py-1 text-xs font-medium text-[#3f7a50]">
                            値下がり中
                          </span>
                                                )}
                                            </div>

                                            <Link
                                                href={`/products/${product.id}`}
                                                className="mb-3 block text-xl font-semibold leading-8 text-[#4b3425] transition hover:text-[#c97d49]"
                                            >
                                                {product.name}
                                            </Link>

                                            {(product.brand || product.packageSize) && (
                                                <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#7a6657]">
                                                    {product.brand && <div>ブランド: {product.brand}</div>}
                                                    {product.packageSize && (
                                                        <div>内容量: {product.packageSize}</div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="mb-4 flex flex-wrap gap-3">
                                                {product.priceSummary.latestEffectivePrice != null && (
                                                    <div className="rounded-2xl bg-[#f7f3ed] px-4 py-3 text-sm">
                                                        <div className="text-xs text-[#8b7b6f]">現在</div>
                                                        <div className="font-semibold text-[#4b3425]">
                                                            ¥
                                                            {product.priceSummary.latestEffectivePrice.toLocaleString()}
                                                        </div>
                                                    </div>
                                                )}

                                                {product.priceSummary.historicalMinPrice != null && (
                                                    <div className="rounded-2xl bg-[#f5e8d8] px-4 py-3 text-sm">
                                                        <div className="text-xs text-[#9a6b3d]">最安</div>
                                                        <div className="font-semibold text-[#8b633d]">
                                                            ¥
                                                            {product.priceSummary.historicalMinPrice.toLocaleString()}
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
                                                            <div className="mt-1 text-2xl font-bold text-[#c97d49]">
                                                                ¥
                                                                {product.lowestOffer.effectivePrice.toLocaleString()}
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
                                            ) : (
                                                <div className="rounded-2xl border border-[#efe4d7] bg-[#faf5ef] p-4 text-sm text-[#9f8d80]">
                                                    オファー情報がありません
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <Pagination
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            q={q}
                            category={category}
                            sort={sort}
                            petType={petType}
                        />
                    </>
                )}
            </div>
        </main>
    );
}