import Link from 'next/link';
import WatchButton from '@/src/components/watch-button';
import PushSubscribeButton from '@/src/components/push-subscribe-button';
import NotificationsLink from '@/src/components/notifications-link';

type ProductResponse = {
  id: string;
  name: string;
  category: string;
  categoryCode: string;
  brand: string | null;
  petType: string;
  packageSize: string | null;
  imageUrl: string | null;
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
};

type CategoryResponse = {
  id: string;
  code: string;
  name: string;
};

async function getProducts(q?: string, category?: string): Promise<ProductResponse[]> {
  const params = new URLSearchParams();

  if (q) params.set('q', q);
  if (category) params.set('category', category);

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

async function getCategories(): Promise<CategoryResponse[]> {
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

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q ?? '';
  const category = params.category ?? '';

  const [products, categories] = await Promise.all([
    getProducts(q, category),
    getCategories(),
  ]);

  return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">PawPrice 商品一覧</h1>
            <div className="mt-3">
              <PushSubscribeButton />
            </div>
          </div>

          <form className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-[1fr_220px_140px]">
              <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="商品名で検索"
                  className="rounded-xl border px-3 py-2"
              />

              <select
                  name="category"
                  defaultValue={category}
                  className="rounded-xl border px-3 py-2"
              >
                <option value="">すべてのカテゴリ</option>
                {categories.map((cat) => (
                    <option key={cat.id} value={cat.code}>
                      {cat.name}
                    </option>
                ))}
              </select>

              <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-white"
              >
                検索
              </button>
            </div>
          </form>

          <div className="mb-4 text-sm text-gray-600">
            検索結果: {products.length}件
          </div>

          {products.length === 0 ? (
              <div className="rounded-2xl border bg-white p-10 text-center text-gray-500 shadow-sm">
                条件に一致する商品はありません
              </div>
          ) : (
              <div className="grid gap-5">
                {products.map((product) => (
                    <div
                        key={product.id}
                        className="rounded-2xl border bg-white p-5 shadow-sm"
                    >
                      <div className="grid gap-5 md:grid-cols-[160px_1fr]">
                        <div className="flex items-start justify-center">
                          {product.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-40 w-40 rounded-xl border object-contain bg-white p-2"
                              />
                          ) : (
                              <div className="flex h-40 w-40 items-center justify-center rounded-xl border bg-gray-100 text-sm text-gray-400">
                                画像なし
                              </div>
                          )}
                        </div>

                        <div>
                          <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        {product.category}
                      </span>
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                        {petTypeLabel(product.petType)}
                      </span>
                            {product.offersCount > 0 && (
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          オファー数 {product.offersCount}
                        </span>
                            )}
                          </div>

                          <Link
                              href={`/products/${product.id}`}
                              className="mb-2 block text-xl font-semibold text-blue-700 underline-offset-2 hover:underline"
                          >
                            {product.name}
                          </Link>

                          <div className="space-y-1 text-sm text-gray-600">
                            <div>ブランド: {product.brand ?? '未設定'}</div>
                            <div>内容量: {product.packageSize ?? '-'}</div>
                          </div>

                          {product.lowestOffer ? (
                              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                <div className="mb-2 text-sm font-semibold text-blue-800">
                                  最安オファー
                                </div>

                                <div className="mb-1 text-sm text-gray-700">
                                  ショップ: {product.lowestOffer.shopType}
                                  {product.lowestOffer.sellerName
                                      ? ` / ${product.lowestOffer.sellerName}`
                                      : ''}
                                </div>

                                <div className="flex flex-wrap items-end gap-4">
                                  <div>
                                    <div className="text-xs text-gray-500">販売価格</div>
                                    <div className="text-lg font-semibold text-gray-800">
                                      ¥{product.lowestOffer.price.toLocaleString()}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs text-gray-500">送料</div>
                                    <div className="text-base text-gray-700">
                                      ¥{product.lowestOffer.shippingFee.toLocaleString()}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs text-gray-500">ポイント</div>
                                    <div className="text-base text-gray-700">
                                      {product.lowestOffer.pointAmount.toLocaleString()}pt
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-xs text-gray-500">実質価格</div>
                                    <div className="text-2xl font-bold text-blue-700">
                                      ¥{product.lowestOffer.effectivePrice.toLocaleString()}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-3">
                                  <a
                                      href={product.lowestOffer.externalUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white"
                                  >
                                    商品ページを見る
                                  </a>

                                  <WatchButton productId={product.id} />
                                </div>
                              </div>
                          ) : (
                              <div className="mt-4 rounded-2xl border bg-gray-50 p-4 text-sm text-gray-500">
                                オファー情報がありません
                              </div>
                          )}
                        </div>
                      </div>
                    </div>
                ))}
              </div>
          )}
        </div>
      </main>
  );
}