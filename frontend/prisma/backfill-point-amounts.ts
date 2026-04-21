import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const applicationId = process.env.RAKUTEN_APPLICATION_ID;
const accessKey = process.env.RAKUTEN_ACCESS_KEY;
const apiBaseUrl =
    process.env.RAKUTEN_API_BASE_URL ||
    'https://openapi.rakuten.co.jp/ichiba-item-search/v1';

if (!connectionString) throw new Error('DATABASE_URL is not set');
if (!applicationId) throw new Error('RAKUTEN_APPLICATION_ID is not set');
if (!accessKey) throw new Error('RAKUTEN_ACCESS_KEY is not set');

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({
        connectionString,
        max: 5,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 10000,
    })),
});

const CONCURRENCY = 5;
const INTERVAL_MS = 300;

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchItemByCode(itemCode: string): Promise<{ pointRate: number; postageFlag: number; price: number } | null> {
    const params = new URLSearchParams({
        applicationId: applicationId!,
        accessKey: accessKey!,
        format: 'json',
        formatVersion: '2',
        itemCode,
        elements: 'itemCode,itemPrice,pointRate,postageFlag',
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
            await sleep(3000);
            return fetchItemByCode(itemCode);
        }
        if (!res.ok) return null;
        const data = await res.json() as { Items?: { itemCode: string; itemPrice: number; pointRate: number; postageFlag: number }[] };
        const item = data.Items?.[0];
        if (!item) return null;
        return { pointRate: item.pointRate ?? 1, postageFlag: item.postageFlag ?? 0, price: item.itemPrice };
    } catch {
        return null;
    }
}

async function runConcurrent<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
    const queue = [...items];
    async function worker() {
        while (queue.length > 0) {
            const item = queue.shift()!;
            await fn(item);
            await sleep(INTERVAL_MS);
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

async function main() {
    const offers = await prisma.productOffer.findMany({
        where: { pointAmount: 0, isActive: true, shopType: 'rakuten' },
        select: { id: true, externalItemId: true, price: true },
    });

    console.log(`backfill-point-amounts: ${offers.length} offers to process`);

    let updated = 0;
    let notFound = 0;
    let errors = 0;
    const now = new Date();

    await runConcurrent(offers, CONCURRENCY, async (offer) => {
        try {
            const data = await fetchItemByCode(offer.externalItemId);
            if (!data) {
                notFound++;
                return;
            }
            const pointAmount = Math.floor(data.price * data.pointRate / 100);
            const effectivePrice = data.price - pointAmount;
            const shippingFee = data.postageFlag === 1 ? 0 : null;

            await prisma.productOffer.update({
                where: { id: offer.id },
                data: { price: data.price, pointAmount, effectivePrice, shippingFee, lastFetchedAt: now },
            });

            if (pointAmount !== offer.pointAmount || data.price !== offer.price) {
                await prisma.priceHistory.create({
                    data: {
                        productOffer: { connect: { id: offer.id } },
                        price: data.price,
                        shippingFee,
                        pointAmount,
                        effectivePrice,
                        fetchedAt: now,
                    },
                });
            }
            updated++;
            if (updated % 500 === 0) console.log(`progress: ${updated}/${offers.length}`);
        } catch (e) {
            console.error(`[ERROR] offer=${offer.id}`, e);
            errors++;
        }
    });

    console.log('\nbackfill-point-amounts done');
    console.log({ total: offers.length, updated, notFound, errors });
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());