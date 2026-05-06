import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const appId = process.env.YAHOO_APP_ID;
if (!appId) throw new Error('YAHOO_APP_ID is not set');

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 3,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 10000,
    })),
});

const API_BASE = 'https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch';
const RESULTS_PER_PAGE = 100;
const API_INTERVAL_MS = 1100;
const DEACTIVATE_AFTER_DAYS = 30;

// ---- 型定義 ----
type YahooHit = {
    name: string;
    url: string;
    code: string;
    price: number;
    inStock: boolean;
    janCode?: string | null;
    image?: { small?: string; medium?: string };
    seller?: { sellerId?: string; name?: string };
    shipping?: { code?: number };
    point?: { amount?: number };
};

type YahooSearchResponse = {
    totalResultsAvailable?: number;
    totalResultsReturned?: number;
    firstResultsPosition?: number;
    hits?: YahooHit[];
};

type SearchQuery = {
    query: string;
    petType: 'dog' | 'cat' | 'both';
    categoryCode: string;
    maxPages?: number;
};

type BrandRule = { keyword: string; brandId: bigint; priority: number };

// ---- カテゴリ別検索クエリ ----
const SEARCH_QUERIES: SearchQuery[] = [
    // フード（多め）
    { query: 'ドッグフード ドライ', petType: 'dog', categoryCode: 'food', maxPages: 10 },
    { query: 'ドッグフード ウェット 缶', petType: 'dog', categoryCode: 'food' },
    { query: '犬 療法食', petType: 'dog', categoryCode: 'food' },
    { query: '犬 サプリメント', petType: 'dog', categoryCode: 'food' },
    { query: 'キャットフード ドライ', petType: 'cat', categoryCode: 'food', maxPages: 10 },
    { query: 'キャットフード ウェット パウチ', petType: 'cat', categoryCode: 'food' },
    { query: 'キャットフード 缶詰', petType: 'cat', categoryCode: 'food' },
    { query: '猫 療法食', petType: 'cat', categoryCode: 'food' },
    { query: '猫草 ペットフード', petType: 'cat', categoryCode: 'food' },
    // おやつ
    { query: '犬 おやつ ジャーキー', petType: 'dog', categoryCode: 'snack' },
    { query: '犬 ガム おやつ 骨', petType: 'dog', categoryCode: 'snack' },
    { query: '犬 おやつ ビスケット', petType: 'dog', categoryCode: 'snack' },
    { query: '猫 おやつ ちゅーる', petType: 'cat', categoryCode: 'snack' },
    { query: '猫 おやつ フリーズドライ', petType: 'cat', categoryCode: 'snack' },
    // トイレ
    { query: '犬 ペットシート トイレシート', petType: 'dog', categoryCode: 'toilet', maxPages: 5 },
    { query: '犬 マナーパンツ おむつ', petType: 'dog', categoryCode: 'toilet' },
    { query: '猫砂 シリカゲル', petType: 'cat', categoryCode: 'toilet' },
    { query: '猫砂 紙 木 おから', petType: 'cat', categoryCode: 'toilet' },
    { query: 'システムトイレ 猫', petType: 'cat', categoryCode: 'toilet' },
    // ケア
    { query: '犬 シャンプー リンス', petType: 'dog', categoryCode: 'care' },
    { query: '犬 歯磨き デンタルケア', petType: 'dog', categoryCode: 'care' },
    { query: '犬 ブラシ トリミング', petType: 'dog', categoryCode: 'care' },
    { query: '犬 ノミ ダニ 防虫', petType: 'dog', categoryCode: 'care' },
    { query: '猫 ブラシ グルーミング', petType: 'cat', categoryCode: 'care' },
    { query: '猫 シャンプー ケア', petType: 'cat', categoryCode: 'care' },
    // おもちゃ
    { query: '犬 おもちゃ ロープ ボール', petType: 'dog', categoryCode: 'toy' },
    { query: '犬 知育玩具 コング', petType: 'dog', categoryCode: 'toy' },
    { query: '猫 おもちゃ 猫じゃらし', petType: 'cat', categoryCode: 'toy' },
    { query: 'キャットタワー おもちゃ 猫', petType: 'cat', categoryCode: 'toy' },
    // お散歩
    { query: '犬 ハーネス リード セット', petType: 'dog', categoryCode: 'outdoor' },
    { query: '犬 首輪 リード', petType: 'dog', categoryCode: 'outdoor' },
    { query: '犬 散歩 バッグ', petType: 'dog', categoryCode: 'outdoor' },
    // ベッド
    { query: 'ペット ベッド クッション 犬', petType: 'dog', categoryCode: 'bed' },
    { query: 'ペット ベッド クッション 猫', petType: 'cat', categoryCode: 'bed' },
    { query: 'ペット マット 寝具', petType: 'both', categoryCode: 'bed' },
    // キャリー
    { query: 'ペット キャリーバッグ 犬', petType: 'dog', categoryCode: 'carry' },
    { query: 'ペット キャリーバッグ 猫', petType: 'cat', categoryCode: 'carry' },
    { query: 'ペット リュック キャリー', petType: 'both', categoryCode: 'carry' },
    // 食器
    { query: 'ペット 食器 フードボウル 犬', petType: 'dog', categoryCode: 'dish' },
    { query: 'ペット 食器 フードボウル 猫', petType: 'cat', categoryCode: 'dish' },
    { query: 'ペット 自動給水器', petType: 'both', categoryCode: 'dish' },
    // ケージ
    { query: '犬 ケージ サークル', petType: 'dog', categoryCode: 'cage' },
    { query: 'キャットタワー 猫 タワー', petType: 'cat', categoryCode: 'cage' },
    { query: '猫 ケージ ハウス', petType: 'cat', categoryCode: 'cage' },
    // ウェア
    { query: '犬 服 ドッグウェア', petType: 'dog', categoryCode: 'wear' },
    { query: '犬 レインコート 洋服', petType: 'dog', categoryCode: 'wear' },
    // 消臭
    { query: 'ペット 消臭剤 脱臭', petType: 'both', categoryCode: 'deodorant' },
    // 医療・介護
    { query: '犬 医療 介護 エリザベスカラー', petType: 'dog', categoryCode: 'medical' },
    { query: '猫 医療 介護', petType: 'cat', categoryCode: 'medical' },
];

// ---- ユーティリティ ----
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function normalizeProductName(name: string | null | undefined): string {
    if (!name) return '';
    const SIZE_RE = /\d+(?:\.\d+)?(?:kg|ml|g|l|m|枚|個|袋|本|pcs)|[sml]サイズ|\b(?:xs|xl|xxl)\b/;
    const keepIfSize = (content: string) => SIZE_RE.test(content) ? ` ${content} ` : ' ';
    return name
        .normalize('NFKC').toLowerCase()
        .replace(/【([^】]*)】/g, (_, c) => keepIfSize(c))
        .replace(/\[([^\]]*)\]/g, (_, c) => keepIfSize(c))
        .replace(/（([^）]*)）/g, (_, c) => keepIfSize(c))
        .replace(/\(([^)]*)\)/g, (_, c) => keepIfSize(c))
        .replace(/送料無料|送料込み|正規品|公式|最安値|限定|お買い得/g, ' ')
        .replace(/ポイント\d+倍|ポイントアップ|セール/gi, ' ')
        .replace(/税込|あす楽|翌日配送/g, ' ')
        .replace(/[|｜/／・●◆★☆※■□▲△▼▽]/g, ' ')
        .replace(/[,:：;；\-‐–—]/g, ' ')
        .replace(/[!"#$%&'*=~^`{}<>?＋+]/g, ' ')
        .replace(/\s+/g, ' ').trim();
}

function extractPackageSize(name: string): string | null {
    const n = name.normalize('NFKC').toLowerCase();
    const patterns = [
        /\d+(?:\.\d+)?kg/, /\d+(?:\.\d+)?ml/, /\d+(?:\.\d+)?mg/,
        /\d+(?:\.\d+)?g(?![a-z])/, /\d+(?:\.\d+)?l(?![a-z])/,
        /\d+枚/, /\d+個/, /\d+袋/, /\d+本/, /\d+pcs/,
        /[sml]サイズ/, /\bxs\b|\bxl\b|\bxxl\b/,
    ];
    for (const p of patterns) {
        const m = n.match(p);
        if (m) return m[0];
    }
    return null;
}

function resolveBrandId(itemName: string, brandRules: BrandRule[]): bigint | null {
    const n = itemName.normalize('NFKC').toLowerCase();
    for (const rule of brandRules) {
        if (n.includes(rule.keyword)) return rule.brandId;
    }
    return null;
}

function isValidJanCode(code: string | null | undefined): code is string {
    if (!code) return false;
    return /^\d{8}$/.test(code) || /^\d{13}$/.test(code);
}

type ProductIndex = {
    janMap: Map<string, bigint>;
    nameMap: Map<string, bigint>;
};

async function buildProductIndex(): Promise<ProductIndex> {
    const products = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, janCode: true, normalizedName: true, packageSize: true, petType: true },
    });
    const janMap = new Map<string, bigint>();
    const nameMap = new Map<string, bigint>();
    for (const p of products) {
        if (p.janCode) janMap.set(p.janCode, p.id);
        if (p.normalizedName) {
            const key = `${p.petType}|${p.normalizedName}|${p.packageSize ?? ''}`;
            nameMap.set(key, p.id);
        }
    }
    console.log(`商品インデックス: ${products.length}件ロード（JAN: ${janMap.size}件）`);
    return { janMap, nameMap };
}

function findExistingProduct(params: {
    itemName: string;
    petType: string;
    janCode: string | null;
    brandRules: BrandRule[];
    index: ProductIndex;
}): bigint | null {
    if (params.janCode) {
        const id = params.index.janMap.get(params.janCode);
        if (id !== undefined) return id;
    }
    const normalizedName = normalizeProductName(params.itemName);
    const packageSize = extractPackageSize(params.itemName);
    const key = `${params.petType}|${normalizedName}|${packageSize ?? ''}`;
    return params.index.nameMap.get(key) ?? null;
}

// ---- Yahoo! API ----
async function fetchYahooItems(query: string, start: number): Promise<YahooSearchResponse> {
    const url = new URL(API_BASE);
    url.searchParams.set('appid', appId!);
    url.searchParams.set('query', query);
    url.searchParams.set('results', String(RESULTS_PER_PAGE));
    url.searchParams.set('start', String(start));
    url.searchParams.set('in_stock', 'true');
    url.searchParams.set('sort', '-score');

    const res = await fetch(url.toString());
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Yahoo API ${res.status}: ${text.slice(0, 300)}`);
    }
    return res.json() as Promise<YahooSearchResponse>;
}

const PET_RE = /犬|猫|ペット|dog|cat|pet|ドッグ|キャット/i;
function isPetRelated(name: string): boolean {
    return PET_RE.test(name);
}

// ---- メイン ----
async function main() {
    console.log('=== Yahoo!ショッピング 商品発見 ===\n');

    const categories = await prisma.category.findMany({
        where: { parentCategoryId: null },
        select: { id: true, code: true },
    });
    const categoryMap = new Map(categories.map(c => [c.code, c.id]));

    const rawBrandRules = await prisma.brandRule.findMany({
        where: { isActive: true },
        include: { brand: { select: { id: true } } },
    });
    const brandRules: BrandRule[] = rawBrandRules
        .sort((a, b) => a.priority - b.priority || b.keyword.length - a.keyword.length)
        .map(r => ({ keyword: r.keyword.normalize('NFKC').toLowerCase(), brandId: r.brand.id, priority: r.priority }));

    const index = await buildProductIndex();
    let totalOffers = 0, totalErrors = 0;

    for (const sq of SEARCH_QUERIES) {
        const categoryId = categoryMap.get(sq.categoryCode);
        if (!categoryId) {
            console.warn(`[skip] categoryCode="${sq.categoryCode}" not found`);
            continue;
        }

        const maxPages = sq.maxPages ?? 5;
        console.log(`\n[クエリ] "${sq.query}" (${sq.petType}/${sq.categoryCode}) 最大${maxPages}ページ`);

        let start = 1;
        let queryOffers = 0;

        while (start <= maxPages * RESULTS_PER_PAGE) {
            await sleep(API_INTERVAL_MS);

            let data: YahooSearchResponse;
            try {
                data = await fetchYahooItems(sq.query, start);
            } catch (e) {
                console.error(`  [API error] start=${start}:`, (e as Error).message);
                break;
            }

            const hits = data.hits ?? [];
            if (hits.length === 0) break;

            for (const hit of hits) {
                if (!hit.inStock || !hit.code || !hit.name) continue;
                if (!isPetRelated(hit.name)) continue;

                const janCode = isValidJanCode(hit.janCode) ? hit.janCode : null;
                const imageUrl = hit.image?.medium ?? hit.image?.small ?? null;
                const pointAmount = hit.point?.amount ?? 0;
                const effectivePrice = Math.max(0, hit.price - pointAmount);
                const shippingFee = hit.shipping?.code === 0 ? 0 : null;

                try {
                    const productId = findExistingProduct({
                        itemName: hit.name,
                        petType: sq.petType,
                        janCode,
                        brandRules,
                        index,
                    });
                    if (!productId) continue;

                    const now = new Date();
                    const offer = await prisma.productOffer.upsert({
                        where: { shopType_externalItemId: { shopType: 'yahoo', externalItemId: hit.code } },
                        update: {
                            productId,
                            title: hit.name,
                            price: hit.price,
                            shippingFee,
                            pointAmount,
                            effectivePrice,
                            externalUrl: hit.url,
                            imageUrl,
                            sellerName: hit.seller?.name ?? null,
                            isActive: true,
                            lastFetchedAt: now,
                        },
                        create: {
                            productId,
                            shopType: 'yahoo',
                            externalItemId: hit.code,
                            title: hit.name,
                            price: hit.price,
                            shippingFee,
                            pointAmount,
                            effectivePrice,
                            externalUrl: hit.url,
                            imageUrl,
                            sellerName: hit.seller?.name ?? null,
                            isActive: true,
                            lastFetchedAt: now,
                        },
                        select: { id: true, _count: { select: { priceHistories: true } } },
                    });
                    if (offer._count.priceHistories === 0) {
                        await prisma.priceHistory.create({
                            data: {
                                productOfferId: offer.id,
                                price: hit.price,
                                shippingFee,
                                pointAmount,
                                effectivePrice,
                                fetchedAt: now,
                            },
                        });
                    }
                    queryOffers++;
                } catch (e) {
                    console.error(`  [error] ${hit.code}: ${(e as Error).message}`);
                    totalErrors++;
                }
            }

            const total = data.totalResultsAvailable ?? 0;
            console.log(`  start=${start} found=${hits.length} total=${total}`);
            start += RESULTS_PER_PAGE;
            if (start > total) break;
        }

        totalOffers += queryOffers;
        console.log(`  → オファー追加: ${queryOffers}件`);
    }

    // 30日以上未更新のYahooオファーを非アクティブ化
    const cutoff = new Date(Date.now() - DEACTIVATE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const deactivated = await prisma.productOffer.updateMany({
        where: { shopType: 'yahoo', isActive: true, lastFetchedAt: { lt: cutoff } },
        data: { isActive: false },
    });

    console.log(`\n=== 完了 ===`);
    console.log(`オファー追加: ${totalOffers}件 / エラー: ${totalErrors}件`);
    console.log(`非アクティブ化: ${deactivated.count}件`);

    await prisma.$disconnect();
}
main().catch(console.error);
