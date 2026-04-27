import 'dotenv/config';
import { appendFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const applicationId = process.env.RAKUTEN_APPLICATION_ID;
const accessKey = process.env.RAKUTEN_ACCESS_KEY;
const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
const apiBaseUrl =
    process.env.RAKUTEN_API_BASE_URL ||
    'https://openapi.rakuten.co.jp/ichiba-item-search/v1';

if (!connectionString) throw new Error('DATABASE_URL is not set');
if (!applicationId) throw new Error('RAKUTEN_APPLICATION_ID is not set');
if (!accessKey) throw new Error('RAKUTEN_ACCESS_KEY is not set');

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({
        connectionString,
        max: 3,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 10000,
    })),
});

// ---- 設定 ----
const GENRE_CONCURRENCY = 2;   // 並列処理するジャンル数（Neon接続安定性のため抑制）
const HITS_PER_PAGE = 30;
const DEFAULT_MAX_PAGES = 5;   // 通常ジャンルの最大ページ数（150件）
const MAJOR_MAX_PAGES = 15;    // 主要ジャンルの最大ページ数（450件）
const API_INTERVAL_MS = 1000;  // リクエスト間隔

// ---- 型定義 ----
type RakutenItemRaw = {
    itemName?: string;
    itemCode?: string;
    itemPrice?: number;
    itemUrl?: string;
    shopName?: string;
    itemCaption?: string;
    mediumImageUrls?: string[];
    pointRate?: number;
    postageFlag?: number;
    genreId?: number;
    Item?: RakutenItemRaw;
} | null | undefined;

type RakutenItem = {
    itemName: string;
    itemCode: string;
    itemPrice: number;
    itemUrl: string;
    shopName: string;
    itemCaption?: string;
    mediumImageUrls?: string[];
    pointRate: number;
    postageFlag: number;
};

type RakutenSearchResponse = {
    Items?: RakutenItemRaw[];
    items?: RakutenItemRaw[];
    pageCount?: number;
};

// ---- ユーティリティ ----
function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeProductName(name: string | null | undefined): string {
    if (!name) return '';
    // ブラケット内にサイズ・個数・セット数が含まれる場合は保持する
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

function inferPetType(itemText: string, genreText?: string): string {
    const DOG_RE = /犬|ドッグ|dog/i;
    const CAT_RE = /猫|キャット|cat/i;
    const hasDog = DOG_RE.test(itemText);
    const hasCat = CAT_RE.test(itemText);
    if (hasDog && hasCat) return 'both';
    if (hasDog) return 'dog';
    if (hasCat) return 'cat';
    // 商品名に判断材料がない場合のみジャンル名で判定
    if (genreText) {
        if (DOG_RE.test(genreText) && CAT_RE.test(genreText)) return 'both';
        if (DOG_RE.test(genreText)) return 'dog';
        if (CAT_RE.test(genreText)) return 'cat';
    }
    return 'both';
}

function extractPackageSize(name: string): string | null {
    const n = name.normalize('NFKC').toLowerCase();
    // ml/mg/kg を先に評価し、m/g/l の誤マッチを防ぐ
    const patterns = [
        /\d+(?:\.\d+)?kg/,
        /\d+(?:\.\d+)?ml/,
        /\d+(?:\.\d+)?mg/,
        /\d+(?:\.\d+)?g(?![a-z])/,
        /\d+(?:\.\d+)?l(?![a-z])/,
        /\d+(?:\.\d+)?m(?![a-z])/,  // メートル (リード等)
        /\d+枚/,
        /\d+個/,
        /\d+袋/,
        /\d+本/,
        /\d+pcs/,
        /[sml]サイズ/,               // S/M/L サイズ
        /\bxs\b|\bxl\b|\bxxl\b/,
    ];
    for (const p of patterns) {
        const m = n.match(p);
        if (m) return m[0];
    }
    return null;
}

function extractJanCode(text: string): string | null {
    const n = text.normalize('NFKC');
    const m13 = n.match(/(?<!\d)\d{13}(?!\d)/g);
    if (m13) return m13[0];
    const m8 = n.match(/(?<!\d)\d{8}(?!\d)/g);
    if (m8) return m8[0];
    return null;
}

function extractModelNumber(text: string): string | null {
    const n = text.normalize('NFKC');
    const patterns = [/\b[A-Z]{1,6}[-]?[A-Z0-9]{2,}\b/gi, /\b[A-Z]+[-]?\d{4,}[A-Z0-9-]*\b/gi];
    const excluded = new Set(['kg', 'ml', 'pcs', 'sale']);
    const candidates = patterns.flatMap((p) => n.match(p) ?? [])
        .map((v) => v.trim())
        .filter((v) => v.length >= 4 && !excluded.has(v.toLowerCase()));
    if (!candidates.length) return null;
    return candidates.sort((a, b) => b.length - a.length)[0];
}

function isPetRelatedProduct(itemName: string, genreName: string): boolean {
    const PET_RE = /犬|猫|ペット|dog|cat|pet/i;
    if (PET_RE.test(genreName)) return true;
    return PET_RE.test(itemName);
}

// ---- ジャンル → 親カテゴリコード 解決 ----
function resolveParentCategoryCode(genreName: string): string {
    const n = genreName.normalize('NFKC').toLowerCase();
    if (/フード|ドライ|ウェット|缶詰|パウチ|療法食|サプリ|ミルク|猫草|生肉/.test(n)) return 'food';
    if (/おやつ|ガム|ジャーキー|ビスケット|ボーロ|チーズ|ささみ|煮干|トリーツ|アイスクリーム|ゼリー|ケーキ|フリーズドライ/.test(n)) return 'snack';
    if (/トイレ|シーツ|猫砂|おむつ|マナーパンツ|マナーベルト|砂取り/.test(n)) return 'toilet';
    if (/食器|給水|給餌|フードスプーン|フードクリップ|計量|水飲み/.test(n)) return 'dish';
    if (/ケージ|サークル|ハウス|キャットタワー|犬小屋|タワー|爪とぎ/.test(n)) return 'cage';
    if (/キャリー|キャリーバッグ|スリング|ペットカート|バギー/.test(n)) return 'carry';
    if (/おもちゃ|玩具|ロープ|ボール|フリスビー|しつけ|アジリティ|またたび|猫じゃらし|ぬいぐるみ/.test(n)) return 'toy';
    if (/消臭|脱臭|空気清浄/.test(n)) return 'deodorant';
    if (/グルーミング|シャンプー|ブラシ|爪切り|耳ケア|歯磨き|ノミ|ダニ|防虫|スキンケア|バス|バリカン|ドライヤー|ウェットティッシュ|タオル/.test(n)) return 'care';
    if (/ウェア|洋服|コスチューム|帽子|靴|シューズ|マフラー|スヌード|バンダナ|レインコート/.test(n)) return 'wear';
    if (/ベッド|クッション|寝具|毛布|ブランケット|暖房|冷房|ホットカーペット/.test(n)) return 'bed';
    if (/首輪|ハーネス|リード|お散歩|散歩|お出かけ|アウトドア|ドライブ/.test(n)) return 'outdoor';
    if (/医療|医薬|介護|応急|検査キット|エリザベス/.test(n)) return 'medical';
    return 'other';
}

// ---- カテゴリ確保（インポート時に親カテゴリ確定） ----
async function ensureCategoryForGenre(
    genreName: string,
    parentByCode: Map<string, bigint>,
): Promise<{ id: bigint }> {
    const code = `rakuten_genre_${normalizeProductName(genreName).replace(/\s+/g, '_').slice(0, 40)}`;
    const parentCode = resolveParentCategoryCode(genreName);
    const parentId = parentByCode.get(parentCode) ?? parentByCode.get('other')!;

    return prisma.category.upsert({
        where: { code },
        update: { name: genreName, parentCategoryId: parentId },
        create: { code, name: genreName, parentCategoryId: parentId },
        select: { id: true },
    });
}

// ---- ブランド解決 ----
type BrandRule = { keyword: string; brandId: bigint; priority: number };

function resolveBrandId(itemName: string, brandRules: BrandRule[]): bigint | null {
    const normalized = itemName.normalize('NFKC').toLowerCase();
    for (const rule of brandRules) {
        if (normalized.includes(rule.keyword)) return rule.brandId;
    }
    return null;
}

// ---- 商品検索・作成 ----
async function findOrCreateProduct(params: {
    categoryId: bigint;
    itemName: string;
    itemCaption?: string | null;
    petType: string;
    imageUrl: string | null;
    brandRules: BrandRule[];
}): Promise<{ id: bigint; created: boolean }> {
    const sourceText = [params.itemName, params.itemCaption ?? ''].join(' ');
    const normalizedName = normalizeProductName(params.itemName);
    const packageSize = extractPackageSize(params.itemName);
    const brandId = resolveBrandId(params.itemName, params.brandRules);
    const janCode = extractJanCode(sourceText);
    const modelNumber = extractModelNumber(sourceText);

    if (janCode) {
        const match = await prisma.product.findFirst({ where: { janCode }, select: { id: true } });
        if (match) return { id: match.id, created: false };
    }
    if (modelNumber && brandId) {
        const match = await prisma.product.findFirst({
            where: { modelNumber, brandId },
            select: { id: true },
        });
        if (match) return { id: match.id, created: false };
    }
    // packageSize も一致キーに含め、容量・個数違いを別商品として扱う
    const nameMatch = await prisma.product.findFirst({
        where: {
            petType: params.petType,
            normalizedName,
            packageSize: packageSize ?? null,
            isActive: true,
            ...(brandId ? { brandId } : {}),
        },
        select: { id: true },
    });
    if (nameMatch) return { id: nameMatch.id, created: false };

    const created = await prisma.product.create({
        data: {
            category: { connect: { id: params.categoryId } },
            ...(brandId ? { brand: { connect: { id: brandId } } } : {}),
            name: params.itemName,
            normalizedName,
            janCode,
            modelNumber,
            petType: params.petType,
            packageSize,
            imageUrl: params.imageUrl,
            isActive: true,
        },
        select: { id: true },
    });
    return { id: created.id, created: true };
}

// ---- Rakuten API ----
function normalizeRakutenItems(rawItems: RakutenItemRaw[]): RakutenItem[] {
    return rawItems.flatMap((raw) => {
        if (!raw) return [];
        const b = raw.Item ?? raw;
        if (!b.itemCode || !b.itemName || typeof b.itemPrice !== 'number' || !b.itemUrl || !b.shopName) return [];
        return [{ itemCode: b.itemCode, itemName: b.itemName, itemPrice: b.itemPrice,
            itemUrl: b.itemUrl, shopName: b.shopName, itemCaption: b.itemCaption,
            mediumImageUrls: b.mediumImageUrls ?? [],
            pointRate: b.pointRate ?? 1,
            postageFlag: b.postageFlag ?? 0 }];
    });
}

async function fetchGenrePage(
    genreId: string,
    page: number,
    retries = 0,
): Promise<{ items: RakutenItem[]; totalPages: number }> {
    const params = new URLSearchParams({
        applicationId: applicationId!,
        accessKey: accessKey!,
        format: 'json',
        formatVersion: '2',
        genreId,
        hits: String(HITS_PER_PAGE),
        page: String(page),
        elements: 'itemName,itemCode,itemPrice,itemUrl,shopName,itemCaption,mediumImageUrls,pointRate,postageFlag',
        ...(affiliateId ? { affiliateId } : {}),
    });

    try {
        const res = await fetch(`${apiBaseUrl}?${params}`, {
            headers: {
                Referer: 'https://pawprice.vercel.app/',
                Origin: 'https://pawprice.vercel.app',
                'User-Agent': 'PawPrice/1.0',
            },
        });

        if (res.status === 429) {
            if (retries >= 5) throw new Error('Rate limit exceeded');
            await sleep(3000 * (retries + 1));
            return fetchGenrePage(genreId, page, retries + 1);
        }
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = (await res.json()) as RakutenSearchResponse;
        const rawItems = data.items ?? data.Items ?? [];
        return {
            items: normalizeRakutenItems(rawItems),
            totalPages: data.pageCount ?? 1,
        };
    } catch (err) {
        if (retries >= 3) throw err;
        await sleep(2000 * (retries + 1));
        return fetchGenrePage(genreId, page, retries + 1);
    }
}

// ---- 並列実行ユーティリティ ----
async function runConcurrent<T>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<void>,
): Promise<void> {
    const queue = [...items];
    async function worker() {
        while (queue.length > 0) {
            const item = queue.shift()!;
            await fn(item);
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

// ---- otherカテゴリ商品の再分類 ----
async function reclassifyOtherProducts(parentByCode: Map<string, bigint>): Promise<void> {
    const otherParentId = parentByCode.get('other')!;

    // other配下の子カテゴリIDを取得
    const otherChildren = await prisma.category.findMany({
        where: { parentCategoryId: otherParentId },
        select: { id: true },
    });
    const otherChildIds = otherChildren.map((c) => c.id);
    if (otherChildIds.length === 0) return;

    const products = await prisma.product.findMany({
        where: { categoryId: { in: otherChildIds }, isActive: true },
        select: { id: true, name: true, categoryId: true },
    });

    console.log(`[reclassify] other配下の商品: ${products.length}件`);

    let reclassified = 0;
    for (const product of products) {
        const parentCode = resolveParentCategoryCode(product.name);
        if (parentCode === 'other') continue;

        // 商品の子カテゴリの親を正しい親に更新
        await prisma.category.update({
            where: { id: product.categoryId },
            data: { parentCategoryId: parentByCode.get(parentCode)! },
        });
        reclassified++;
    }
    console.log(`[reclassify] 再分類完了: ${reclassified}件`);
}

// ---- メイン ----
async function main() {
    const genres = await prisma.genre.findMany({
        where: { platform: 'rakuten', isPetGenre: true, isActive: true, name: { notIn: ['その他'] } },
        orderBy: [{ level: 'asc' }, { externalGenreId: 'asc' }],
    });

    const parentCategories = await prisma.category.findMany({
        where: { parentCategoryId: null },
        select: { id: true, code: true },
    });
    const parentByCode = new Map(parentCategories.map((p) => [p.code, p.id]));

    const rawBrandRules = await prisma.brandRule.findMany({
        where: { isActive: true },
        include: { brand: { select: { id: true } } },
    });
    const brandRules: BrandRule[] = rawBrandRules
        .sort((a, b) => a.priority - b.priority || b.keyword.length - a.keyword.length)
        .map((r) => ({ keyword: r.keyword.normalize('NFKC').toLowerCase(), brandId: r.brand.id, priority: r.priority }));

    console.log(`genres=${genres.length}`);

    // other配下の既存商品を再分類
    await reclassifyOtherProducts(parentByCode);

    let totalCreatedProducts = 0;
    let totalCreatedOffers = 0;
    let totalSkippedOffers = 0;
    let totalSkippedNonPet = 0;
    let totalErrors = 0;

    await runConcurrent(genres, GENRE_CONCURRENCY, async (genre) => {
        const category = await ensureCategoryForGenre(genre.name, parentByCode);
        const isMajor = /フード|ドッグフード|キャットフード|猫砂|ペットシーツ|トイレ|おやつ/.test(genre.name);
        const maxPages = isMajor ? MAJOR_MAX_PAGES : DEFAULT_MAX_PAGES;

        let page = 1;
        let actualMaxPages = maxPages;

        while (page <= actualMaxPages) {
            const { items, totalPages } = await fetchGenrePage(genre.externalGenreId, page);
            // 初回でtotalPagesを確定
            if (page === 1) actualMaxPages = Math.min(totalPages, maxPages);

            if (items.length === 0) break;

            for (const item of items) {
                if (!isPetRelatedProduct(item.itemName, genre.name)) {
                    totalSkippedNonPet++;
                    continue;
                }

                // 既存offerはupdate-prices.tsで処理するのでスキップ
                const existingOffer = await prisma.productOffer.findUnique({
                    where: { shopType_externalItemId: { shopType: 'rakuten', externalItemId: item.itemCode } },
                    select: { id: true },
                });
                if (existingOffer) {
                    totalSkippedOffers++;
                    continue;
                }

                const imageUrl = item.mediumImageUrls?.[0] ?? null;
                const petType = inferPetType([item.itemName, item.itemCaption ?? ''].join(' '), genre.name);

                const { id: productId, created } = await findOrCreateProduct({
                    categoryId: category.id,
                    itemName: item.itemName,
                    itemCaption: item.itemCaption,
                    petType,
                    imageUrl,
                    brandRules,
                });
                if (created) totalCreatedProducts++;

                const now = new Date();
                const pointAmount = Math.floor(item.itemPrice * item.pointRate / 100);
                const effectivePrice = item.itemPrice - pointAmount;
                const shippingFee = item.postageFlag === 1 ? 0 : null;

                try {
                    await prisma.$transaction(async (tx) => {
                        const offer = await tx.productOffer.create({
                            data: {
                                product: { connect: { id: productId } },
                                shopType: 'rakuten',
                                externalItemId: item.itemCode,
                                externalUrl: item.itemUrl,
                                title: item.itemName,
                                sellerName: item.shopName,
                                price: item.itemPrice,
                                shippingFee,
                                pointAmount,
                                effectivePrice,
                                imageUrl,
                                lastFetchedAt: now,
                                isActive: true,
                            },
                            select: { id: true },
                        });

                        await tx.priceHistory.create({
                            data: {
                                productOfferId: offer.id,
                                price: item.itemPrice,
                                shippingFee,
                                pointAmount,
                                effectivePrice,
                                fetchedAt: now,
                            },
                        });
                    });
                    totalCreatedOffers++;
                } catch (e: any) {
                    if (e?.code === 'P2002') {
                        // 並列ジャンル処理での重複 → 別ワーカーが先に登録済み
                        totalSkippedOffers++;
                    } else {
                        console.error(`[error] item=${item.itemCode}`, e);
                        totalErrors++;
                    }
                }
            }

            page++;
            await sleep(API_INTERVAL_MS);
        }

        console.log(`[discover] genre="${genre.name}" pages=${actualMaxPages} done`);
    });

    console.log('discover-products done');
    console.log({ genres: genres.length, totalCreatedProducts, totalCreatedOffers, totalSkippedOffers, totalSkippedNonPet, totalErrors });

    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile) {
        const lines = [
            '## Discover Products 結果',
            '',
            '| 項目 | 件数 |',
            '|------|-----:|',
            `| 商品新規追加 | ${totalCreatedProducts} |`,
            `| オファー新規追加 | ${totalCreatedOffers} |`,
            `| スキップ（既存） | ${totalSkippedOffers} |`,
            `| スキップ（非ペット） | ${totalSkippedNonPet} |`,
            `| エラー | ${totalErrors} |`,
            `| ジャンル数 | ${genres.length} |`,
            '',
        ];
        appendFileSync(summaryFile, lines.join('\n'));
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
