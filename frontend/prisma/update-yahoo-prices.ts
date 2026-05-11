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
const API_INTERVAL_MS = 2100;      // 公式制限: 30リクエスト/分（2022-05-20変更）。60s÷30=2s、安全マージン込み2.1s
const DEACTIVATE_AFTER_DAYS = 30;

type YahooHit = {
    name: string;
    url: string;
    code: string;
    price: number;
    inStock: boolean;
    image?: { small?: string; medium?: string };
    seller?: { name?: string };
    shipping?: { code?: number };
    point?: { amount?: number };
};

type YahooSearchResponse = {
    totalResultsAvailable?: number;
    hits?: YahooHit[];
};

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// JANコードで検索して全ヒットを返す
async function searchByJan(janCode: string): Promise<YahooHit[]> {
    const url = new URL(API_BASE);
    url.searchParams.set('appid', appId!);
    url.searchParams.set('jan_code', janCode);
    url.searchParams.set('results', String(RESULTS_PER_PAGE));
    url.searchParams.set('in_stock', 'true');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Yahoo API ${res.status}`);
    const data = await res.json() as YahooSearchResponse;
    return data.hits ?? [];
}

// 商品名で検索してitem codeに一致するものを探す
async function searchByName(query: string, targetCode: string): Promise<YahooHit | null> {
    const url = new URL(API_BASE);
    url.searchParams.set('appid', appId!);
    url.searchParams.set('query', query);
    url.searchParams.set('results', String(RESULTS_PER_PAGE));
    url.searchParams.set('in_stock', 'true');
    url.searchParams.set('sort', '-score');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Yahoo API ${res.status}`);
    const data = await res.json() as YahooSearchResponse;
    return (data.hits ?? []).find(h => h.code === targetCode) ?? null;
}

async function main() {
    console.log('=== Yahoo!ショッピング 価格更新 ===\n');
    const now = new Date();

    // アクティブな楽天オファーを持つ商品のYahooオファーのみ対象
    const offers = await prisma.productOffer.findMany({
        where: {
            shopType: 'yahoo',
            isActive: true,
            product: { offers: { some: { shopType: 'rakuten', isActive: true } } },
        },
        select: {
            id: true,
            externalItemId: true,
            price: true,
            pointAmount: true,
            effectivePrice: true,
            _count: { select: { priceHistories: true } },
            product: { select: { janCode: true, normalizedName: true } },
        },
    });

    console.log(`対象オファー: ${offers.length}件\n`);

    // JANコードあり / なしに分類
    const withJan: typeof offers = [];
    const withoutJan: typeof offers = [];
    for (const o of offers) {
        if (o.product.janCode) withJan.push(o);
        else withoutJan.push(o);
    }

    // JANコードをキーにofferをマップ
    const janToOffers = new Map<string, typeof offers>();
    for (const o of withJan) {
        const jan = o.product.janCode!;
        if (!janToOffers.has(jan)) janToOffers.set(jan, []);
        janToOffers.get(jan)!.push(o);
    }

    let updated = 0, unchanged = 0, notFound = 0, errors = 0, baselineCreated = 0;

    // ---- JANコードで一括検索・更新 ----
    console.log(`[JAN検索] ${janToOffers.size}種類のJANコードを処理中...`);
    for (const [janCode, janOffers] of janToOffers) {
        await sleep(API_INTERVAL_MS);
        let hits: YahooHit[] = [];
        try {
            hits = await searchByJan(janCode);
        } catch (e) {
            console.error(`[error] JAN=${janCode}: ${(e as Error).message}`);
            errors++;
            continue;
        }

        for (const offer of janOffers) {
            const hit = hits.find(h => h.code === offer.externalItemId);
            if (!hit) {
                notFound++;
                continue;
            }

            const newPointAmount = hit.point?.amount ?? 0;
            const newEffectivePrice = Math.max(0, hit.price - newPointAmount);
            const newShippingFee = hit.shipping?.code === 0 ? 0 : null;
            const priceChanged = hit.price !== offer.price || newPointAmount !== offer.pointAmount;
            const hasNoHistory = offer._count.priceHistories === 0;

            try {
                await prisma.productOffer.update({
                    where: { id: offer.id },
                    data: {
                        price: hit.price,
                        pointAmount: newPointAmount,
                        effectivePrice: newEffectivePrice,
                        shippingFee: newShippingFee,
                        isActive: true,
                        lastFetchedAt: now,
                    },
                });

                if (priceChanged || hasNoHistory) {
                    await prisma.priceHistory.create({
                        data: {
                            productOfferId: offer.id,
                            price: hit.price,
                            shippingFee: newShippingFee,
                            pointAmount: newPointAmount,
                            effectivePrice: newEffectivePrice,
                            fetchedAt: now,
                        },
                    });
                    if (priceChanged) {
                        const dir = newEffectivePrice < offer.effectivePrice ? '↓' : '↑';
                        console.log(`[${dir}] ${offer.externalItemId} ¥${offer.effectivePrice} → ¥${newEffectivePrice}`);
                        updated++;
                    } else {
                        baselineCreated++;
                    }
                } else {
                    unchanged++;
                }
            } catch (e) {
                console.error(`[error] offer=${offer.id}: ${(e as Error).message}`);
                errors++;
            }
        }
    }

    // ---- JANなし: 商品名で検索 ----
    console.log(`\n[名前検索] ${withoutJan.length}件を処理中...`);
    for (const offer of withoutJan) {
        if (!offer.product.normalizedName) { notFound++; continue; }
        await sleep(API_INTERVAL_MS);

        let hit: YahooHit | null = null;
        try {
            hit = await searchByName(offer.product.normalizedName, offer.externalItemId);
        } catch (e) {
            console.error(`[error] offer=${offer.id}: ${(e as Error).message}`);
            errors++;
            continue;
        }

        if (!hit) { notFound++; continue; }

        const newPointAmount = hit.point?.amount ?? 0;
        const newEffectivePrice = Math.max(0, hit.price - newPointAmount);
        const newShippingFee = hit.shipping?.code === 0 ? 0 : null;
        const priceChanged = hit.price !== offer.price || newPointAmount !== offer.pointAmount;
        const hasNoHistory = offer._count.priceHistories === 0;

        try {
            await prisma.productOffer.update({
                where: { id: offer.id },
                data: {
                    price: hit.price,
                    pointAmount: newPointAmount,
                    effectivePrice: newEffectivePrice,
                    shippingFee: newShippingFee,
                    isActive: true,
                    lastFetchedAt: now,
                },
            });

            if (priceChanged || hasNoHistory) {
                await prisma.priceHistory.create({
                    data: {
                        productOfferId: offer.id,
                        price: hit.price,
                        shippingFee: newShippingFee,
                        pointAmount: newPointAmount,
                        effectivePrice: newEffectivePrice,
                        fetchedAt: now,
                    },
                });
                if (priceChanged) {
                    const dir = newEffectivePrice < offer.effectivePrice ? '↓' : '↑';
                    console.log(`[${dir}] ${offer.externalItemId} ¥${offer.effectivePrice} → ¥${newEffectivePrice}`);
                    updated++;
                } else {
                    baselineCreated++;
                }
            } else {
                unchanged++;
            }
        } catch (e) {
            console.error(`[error] offer=${offer.id}: ${(e as Error).message}`);
            errors++;
        }
    }

    // 30日以上未更新のYahooオファーを非アクティブ化
    const cutoff = new Date(now.getTime() - DEACTIVATE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const deactivated = await prisma.productOffer.updateMany({
        where: { shopType: 'yahoo', isActive: true, lastFetchedAt: { lt: cutoff } },
        data: { isActive: false },
    });

    console.log(`\n=== 完了 ===`);
    console.log(`更新: ${updated}件 / 変化なし: ${unchanged}件 / 未検出: ${notFound}件`);
    console.log(`ベースライン作成: ${baselineCreated}件 / エラー: ${errors}件`);
    console.log(`非アクティブ化: ${deactivated.count}件`);

    await prisma.$disconnect();
}
main().catch(console.error);
