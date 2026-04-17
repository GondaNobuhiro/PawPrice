import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {sleep} from "effect/Clock";

const connectionString = process.env.DATABASE_URL;
const applicationId = process.env.RAKUTEN_APPLICATION_ID;
const accessKey = process.env.RAKUTEN_ACCESS_KEY;
const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
const apiBaseUrl = process.env.RAKUTEN_API_BASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

if (!applicationId) {
    throw new Error('RAKUTEN_APPLICATION_ID is not set');
}

if (!accessKey) {
    throw new Error('RAKUTEN_ACCESS_KEY is not set');
}

if (!apiBaseUrl) {
    throw new Error('RAKUTEN_API_BASE_URL is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString })),
});

type RakutenItem = {
    itemName: string;
    itemCode: string;
    itemPrice: number;
    itemUrl: string;
    shopName: string;
    mediumImageUrls?: string[];
};

type RakutenResponse = {
    Items: RakutenItem[];
    GenreInformation?: unknown[];
    Attributes?: unknown[];
};

const CATEGORY_MAP = [
    // フード
    {
        categoryCode: 'dog_cat_food',
        keyword: 'ロイヤルカナン 猫 フード 2kg',
        petType: 'cat',
    },
    {
        categoryCode: 'dog_cat_food',
        keyword: 'ドッグフード 無添加',
        petType: 'dog',
    },

    // トイレ用品
    {
        categoryCode: 'toilet_supplies',
        keyword: '猫 トイレ用品',
        petType: 'cat',
    },

    // ペットシーツ
    {
        categoryCode: 'pet_sheets',
        keyword: 'ペットシーツ レギュラー',
        petType: 'dog',
    },
    {
        categoryCode: 'pet_sheets',
        keyword: 'ペットシーツ ワイド',
        petType: 'dog',
    },
    {
        categoryCode: 'pet_sheets',
        keyword: 'ペットシーツ スーパーワイド',
        petType: 'dog',
    },

    // おやつ
    {
        categoryCode: 'snacks',
        keyword: '犬 おやつ 無添加',
        petType: 'dog',
    },
    {
        categoryCode: 'snacks',
        keyword: '猫 おやつ チュール',
        petType: 'cat',
    },

    // 猫砂
    {
        categoryCode: 'cat_litter',
        keyword: '猫砂 固まる',
        petType: 'cat',
    },
    {
        categoryCode: 'cat_litter',
        keyword: '猫砂 おから',
        petType: 'cat',
    },

    // トイレ本体
    {
        categoryCode: 'toilet_main_unit',
        keyword: '猫 トイレ 本体',
        petType: 'cat',
    },

    // 給水器
    {
        categoryCode: 'water_feeders',
        keyword: '猫 給水器 自動',
        petType: 'cat',
    },
    {
        categoryCode: 'water_feeders',
        keyword: '犬 給水器',
        petType: 'dog',
    },

    // 食器
    {
        categoryCode: 'feeding_bowls',
        keyword: '犬 猫 食器 おしゃれ',
        petType: 'both',
    },

    // ケージ
    {
        categoryCode: 'cages',
        keyword: '犬 ケージ 室内',
        petType: 'dog',
    },
    {
        categoryCode: 'cages',
        keyword: '猫 ケージ 3段',
        petType: 'cat',
    },

    // キャリー
    {
        categoryCode: 'carriers',
        keyword: '猫 キャリーバッグ',
        petType: 'cat',
    },
    {
        categoryCode: 'carriers',
        keyword: '犬 キャリーバッグ 小型犬',
        petType: 'dog',
    },

    // おもちゃ
    {
        categoryCode: 'toys',
        keyword: '猫 おもちゃ ねこじゃらし',
        petType: 'cat',
    },
    {
        categoryCode: 'toys',
        keyword: '犬 おもちゃ 噛む',
        petType: 'dog',
    },

    // 爪とぎ
    {
        categoryCode: 'scratchers',
        keyword: '猫 爪とぎ ポール',
        petType: 'cat',
    },

    // 消臭
    {
        categoryCode: 'deodorizers',
        keyword: 'ペット 消臭 スプレー',
        petType: 'both',
    },
] as const;

async function fetchRakutenItems(
    keyword: string,
    retryCount = 0,
): Promise<RakutenItem[]> {
    const params = new URLSearchParams();
    params.set('applicationId', applicationId!);
    params.set('accessKey', accessKey!);
    params.set('format', 'json');
    params.set('formatVersion', '2');
    params.set('keyword', keyword);
    params.set('hits', '20');
    params.set('sort', '+itemPrice');
    params.set('elements', 'itemName,itemCode,itemPrice,itemUrl,shopName,mediumImageUrls');

    if (affiliateId) {
        params.set('affiliateId', affiliateId);
    }

    const url = `${apiBaseUrl}?${params.toString()}`;

    const res = await fetch(url, {
        headers: {
            Referer: 'https://pawprice.vercel.app/',
            Origin: 'https://pawprice.vercel.app',
            'User-Agent': 'PawPrice/0.1',
        },
    });

    const text = await res.text();

    if (res.status === 429) {
        if (retryCount >= 3) {
            console.error('Rakuten API status:', res.status);
            console.error('Rakuten API error body:', text);
            throw new Error('Rakuten API rate limit exceeded after retries');
        }

        console.warn(`Rate limit hit. retryCount=${retryCount + 1}`);
        await sleep(1500);
        return fetchRakutenItems(keyword, retryCount + 1);
    }

    if (!res.ok) {
        console.error('Rakuten API status:', res.status);
        console.error('Rakuten API error body:', text);
        throw new Error(`Rakuten API request failed: ${res.status}`);
    }

    const data = JSON.parse(text) as {
        Items?: RakutenItem[];
        items?: RakutenItem[];
    };

    const items = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.Items)
            ? data.Items
            : null;

    if (!items) {
        console.error('Unexpected Rakuten response object:', data);
        throw new Error('Rakuten API response does not contain iterable items');
    }

    return items;
}

function normalizeProductName(name: string): string {
    return name
        .replace(/\s+/g, ' ')
        .replace(/[【】\[\]()（）]/g, ' ')
        .trim();
}

async function findOrCreateProduct(params: {
    categoryId: bigint;
    itemName: string;
    petType: string;
    imageUrl: string | null;
}): Promise<{ id: bigint }> {
    const normalizedName = normalizeProductName(params.itemName);

    const existingProduct = await prisma.product.findFirst({
        where: {
            categoryId: params.categoryId,
            normalizedName,
            petType: params.petType,
        },
        select: {
            id: true,
        },
    });

    if (existingProduct) {
        return existingProduct;
    }

    return prisma.product.create({
        data: {
            category: {
                connect: { id: params.categoryId },
            },
            name: params.itemName,
            normalizedName,
            petType: params.petType,
            imageUrl: params.imageUrl,
            isActive: true,
        },
        select: {
            id: true,
        },
    });
}

async function upsertRakutenOffers() {
    for (const target of CATEGORY_MAP) {
        const category = await prisma.category.findUnique({
            where: { code: target.categoryCode },
            select: {
                id: true,
                code: true,
                name: true,
            },
        });

        if (!category) {
            console.warn(`category not found: ${target.categoryCode}`);
            continue;
        }

        console.log(`fetching category=${category.code}, keyword=${target.keyword}`);

        const items = await fetchRakutenItems(target.keyword);

        for (const item of items) {
            const imageUrl = item.mediumImageUrls?.[0] ?? null;
            const effectivePrice = item.itemPrice;
            const now = new Date();

            const existingOffer = await prisma.productOffer.findUnique({
                where: {
                    shopType_externalItemId: {
                        shopType: 'rakuten',
                        externalItemId: item.itemCode,
                    },
                },
                include: {
                    priceHistories: {
                        orderBy: {
                            fetchedAt: 'desc',
                        },
                        take: 1,
                    },
                },
            });

            let productId: bigint;

            if (existingOffer) {
                productId = existingOffer.productId;

                await prisma.product.update({
                    where: {
                        id: productId,
                    },
                    data: {
                        name: item.itemName,
                        normalizedName: normalizeProductName(item.itemName),
                        petType: target.petType,
                        imageUrl,
                        isActive: true,
                    },
                });

                await prisma.productOffer.update({
                    where: {
                        id: existingOffer.id,
                    },
                    data: {
                        title: item.itemName,
                        sellerName: item.shopName,
                        price: item.itemPrice,
                        shippingFee: 0,
                        pointAmount: 0,
                        effectivePrice,
                        externalUrl: item.itemUrl,
                        imageUrl,
                        lastFetchedAt: now,
                        isActive: true,
                    },
                });

                const latestHistory = existingOffer.priceHistories[0];
                const shouldCreateHistory =
                    !latestHistory ||
                    latestHistory.price !== item.itemPrice ||
                    latestHistory.effectivePrice !== effectivePrice;

                if (shouldCreateHistory) {
                    await prisma.priceHistory.create({
                        data: {
                            productOffer: {
                                connect: { id: existingOffer.id },
                            },
                            price: item.itemPrice,
                            shippingFee: 0,
                            pointAmount: 0,
                            effectivePrice,
                            fetchedAt: now,
                        },
                    });
                }

                console.log(
                    `updated offer: ${item.itemCode} / ${item.itemName} / price=${item.itemPrice}`,
                );
            } else {
                const product = await findOrCreateProduct({
                    categoryId: category.id,
                    itemName: item.itemName,
                    petType: target.petType,
                    imageUrl,
                });

                productId = product.id;

                const offer = await prisma.productOffer.create({
                    data: {
                        product: {
                            connect: { id: productId },
                        },
                        shopType: 'rakuten',
                        externalItemId: item.itemCode,
                        externalUrl: item.itemUrl,
                        title: item.itemName,
                        sellerName: item.shopName,
                        price: item.itemPrice,
                        shippingFee: 0,
                        pointAmount: 0,
                        effectivePrice,
                        imageUrl,
                        lastFetchedAt: now,
                        isActive: true,
                    },
                });

                await prisma.priceHistory.create({
                    data: {
                        productOffer: {
                            connect: { id: offer.id },
                        },
                        price: item.itemPrice,
                        shippingFee: 0,
                        pointAmount: 0,
                        effectivePrice,
                        fetchedAt: now,
                    },
                });

                console.log(
                    `created offer: ${item.itemCode} / ${item.itemName} / price=${item.itemPrice}`,
                );
            }
        }
    }
}

async function main() {
    await upsertRakutenOffers();
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });