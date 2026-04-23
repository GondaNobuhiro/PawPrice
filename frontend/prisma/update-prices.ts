import 'dotenv/config';
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
const GENRE_CONCURRENCY = 3;
const HITS_PER_PAGE = 30;
const API_INTERVAL_MS = 1000;

// N日以上更新されていないofferを非アクティブ化
const DEACTIVATE_AFTER_DAYS = 7;

type RakutenItemRaw = {
    itemName?: string;
    itemCode?: string;
    itemPrice?: number;
    pointRate?: number;
    postageFlag?: number;
    Item?: RakutenItemRaw;
} | null | undefined;

type RakutenSearchResponse = {
    Items?: RakutenItemRaw[];
    items?: RakutenItemRaw[];
    pageCount?: number;
};

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

type ItemData = { price: number; pointRate: number; postageFlag: number };

async function fetchGenrePage(
    genreId: string,
    page: number,
    retries = 0,
): Promise<{ itemMap: Map<string, ItemData>; totalPages: number }> {
    const params = new URLSearchParams({
        applicationId: applicationId!,
        accessKey: accessKey!,
        format: 'json',
        formatVersion: '2',
        genreId,
        hits: String(HITS_PER_PAGE),
        page: String(page),
        elements: 'itemCode,itemPrice,pointRate,postageFlag',
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
            if (retries >= 5) return { itemMap: new Map(), totalPages: 0 };
            await sleep(3000 * (retries + 1));
            return fetchGenrePage(genreId, page, retries + 1);
        }
        if (!res.ok) return { itemMap: new Map(), totalPages: 0 };

        const data = (await res.json()) as RakutenSearchResponse;
        const rawItems = data.items ?? data.Items ?? [];

        const itemMap = new Map<string, ItemData>();
        for (const raw of rawItems) {
            if (!raw) continue;
            const b = raw.Item ?? raw;
            if (b?.itemCode && typeof b?.itemPrice === 'number') {
                itemMap.set(b.itemCode, {
                    price: b.itemPrice,
                    pointRate: b.pointRate ?? 1,
                    postageFlag: b.postageFlag ?? 0,
                });
            }
        }
        return { itemMap, totalPages: data.pageCount ?? 1 };
    } catch {
        if (retries >= 3) return { itemMap: new Map(), totalPages: 0 };
        await sleep(2000 * (retries + 1));
        return fetchGenrePage(genreId, page, retries + 1);
    }
}

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

async function main() {
    const genres = await prisma.genre.findMany({
        where: { platform: 'rakuten', isPetGenre: true, isActive: true },
        select: { externalGenreId: true, name: true },
    });

    // 今回のスキャンで更新されたofferを追跡
    const updatedOfferIds = new Set<bigint>();
    const now = new Date();

    let priceUpdated = 0;
    let priceUnchanged = 0;

    await runConcurrent(genres, GENRE_CONCURRENCY, async (genre) => {
        // 全ページをスキャンして itemCode→ItemData マップを構築
        const genreItemMap = new Map<string, ItemData>();
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
            const result = await fetchGenrePage(genre.externalGenreId, page);
            if (page === 1) totalPages = result.totalPages;
            for (const [code, data] of Array.from(result.itemMap)) {
                genreItemMap.set(code, data);
            }
            if (result.itemMap.size === 0) break;
            page++;
            await sleep(API_INTERVAL_MS);
        }

        if (genreItemMap.size === 0) return;

        // このジャンルで見つかったitemCodeに対応するofferを取得
        const offers = await prisma.productOffer.findMany({
            where: {
                shopType: 'rakuten',
                isActive: true,
                externalItemId: { in: Array.from(genreItemMap.keys()) },
            },
            select: {
                id: true,
                externalItemId: true,
                price: true,
                pointAmount: true,
                _count: { select: { priceHistories: true } },
            },
        });

        for (const offer of offers) {
            const itemData = genreItemMap.get(offer.externalItemId);
            if (itemData === undefined) continue;

            const { price: newPrice, pointRate, postageFlag } = itemData;
            const newPointAmount = Math.floor(newPrice * pointRate / 100);
            const newEffectivePrice = newPrice - newPointAmount;
            const newShippingFee = postageFlag === 1 ? 0 : null;

            updatedOfferIds.add(offer.id);

            await prisma.productOffer.update({
                where: { id: offer.id },
                data: { price: newPrice, pointAmount: newPointAmount, effectivePrice: newEffectivePrice, shippingFee: newShippingFee, lastFetchedAt: now },
            });

            const priceChanged = newPrice !== offer.price || newPointAmount !== offer.pointAmount;
            const hasNoHistory = offer._count.priceHistories === 0;

            if (priceChanged || hasNoHistory) {
                await prisma.priceHistory.create({
                    data: {
                        productOffer: { connect: { id: offer.id } },
                        price: newPrice,
                        shippingFee: newShippingFee,
                        pointAmount: newPointAmount,
                        effectivePrice: newEffectivePrice,
                        fetchedAt: now,
                    },
                });
                if (priceChanged) {
                    console.log(`[updated] ${offer.externalItemId} ${offer.price} → ${newPrice}`);
                    priceUpdated++;
                } else {
                    console.log(`[baseline] ${offer.externalItemId} ¥${newPrice}`);
                    priceUpdated++;
                }
            } else {
                priceUnchanged++;
            }
        }

        console.log(`[scan] genre="${genre.name}" found=${genreItemMap.size} matched=${offers.length}`);
    });

    // 履歴0件のアクティブofferにベースラインを作成（discover時の失敗などで孤立したもの）
    const noHistoryOffers = await prisma.productOffer.findMany({
        where: { isActive: true, priceHistories: { none: {} } },
        select: { id: true, price: true, shippingFee: true, pointAmount: true, effectivePrice: true },
    });
    for (const offer of noHistoryOffers) {
        await prisma.priceHistory.create({
            data: {
                productOffer: { connect: { id: offer.id } },
                price: offer.price,
                shippingFee: offer.shippingFee,
                pointAmount: offer.pointAmount,
                effectivePrice: offer.effectivePrice,
                fetchedAt: now,
            },
        });
    }
    if (noHistoryOffers.length > 0) {
        console.log(`[backfill] 履歴0件のoffer ${noHistoryOffers.length}件にbaseline作成`);
    }

    // 一定期間スキャンで見つからないofferを非アクティブ化
    const cutoff = new Date(now.getTime() - DEACTIVATE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const deactivated = await prisma.productOffer.updateMany({
        where: {
            shopType: 'rakuten',
            isActive: true,
            lastFetchedAt: { lt: cutoff },
        },
        data: { isActive: false },
    });

    console.log('update-prices done');
    console.log({
        genres: genres.length,
        priceUpdated,
        priceUnchanged,
        deactivated: deactivated.count,
    });
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
