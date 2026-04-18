import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

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
    itemCaption?: string;
    mediumImageUrls?: string[];
};

const CATEGORY_MAP = [
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
    {
        categoryCode: 'toilet_supplies',
        keyword: '猫 トイレ用品',
        petType: 'cat',
    },
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
    {
        categoryCode: 'toilet_main_unit',
        keyword: '猫 トイレ 本体',
        petType: 'cat',
    },
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
    {
        categoryCode: 'feeding_bowls',
        keyword: '犬 猫 食器 おしゃれ',
        petType: 'both',
    },
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
    {
        categoryCode: 'scratchers',
        keyword: '猫 爪とぎ ポール',
        petType: 'cat',
    },
    {
        categoryCode: 'deodorizers',
        keyword: 'ペット 消臭 スプレー',
        petType: 'both',
    },
] as const;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    params.set(
        'elements',
        'itemName,itemCode,itemPrice,itemUrl,shopName,itemCaption,mediumImageUrls',
    );

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
        await sleep(2000);
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
        .normalize('NFKC')
        .toLowerCase()
        .replace(/【[^】]*】/g, ' ')
        .replace(/\[[^\]]*]/g, ' ')
        .replace(/（[^）]*）/g, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/送料無料/g, ' ')
        .replace(/送料込み/g, ' ')
        .replace(/正規品/g, ' ')
        .replace(/公式/g, ' ')
        .replace(/最安値/g, ' ')
        .replace(/限定/g, ' ')
        .replace(/お買い得/g, ' ')
        .replace(/ポイント\d+倍/g, ' ')
        .replace(/ポイントアップ/g, ' ')
        .replace(/セール/g, ' ')
        .replace(/sale/gi, ' ')
        .replace(/税込/g, ' ')
        .replace(/あす楽/g, ' ')
        .replace(/翌日配送/g, ' ')
        .replace(/[|｜/／・●◆★☆※■□▲△▼▽]/g, ' ')
        .replace(/[,:：;；]/g, ' ')
        .replace(/[-‐-‒–—―]/g, ' ')
        .replace(/[!"#$%&'*=~^`{}<>?＋+]/g, ' ')
        .replace(/(\d)\s*kg/g, '$1kg')
        .replace(/(\d)\s*g/g, '$1g')
        .replace(/(\d)\s*ml/g, '$1ml')
        .replace(/(\d)\s*l/g, '$1l')
        .replace(/(\d)\s*枚/g, '$1枚')
        .replace(/(\d)\s*個/g, '$1個')
        .replace(/(\d)\s*袋/g, '$1袋')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractPackageSize(name: string): string | null {
    const normalized = name.normalize('NFKC').toLowerCase();

    const patterns = [
        /\b\d+(?:\.\d+)?kg\b/,
        /\b\d+(?:\.\d+)?g\b/,
        /\b\d+(?:\.\d+)?l\b/,
        /\b\d+(?:\.\d+)?ml\b/,
        /\b\d+枚\b/,
        /\b\d+個\b/,
        /\b\d+袋\b/,
        /\b\d+本\b/,
        /\b\d+pcs\b/,
    ];

    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match) {
            return match[0];
        }
    }

    return null;
}

function extractJanCode(text: string): string | null {
    const normalized = text.normalize('NFKC');

    const jan13Matches = normalized.match(/(?<!\d)\d{13}(?!\d)/g);
    if (jan13Matches && jan13Matches.length > 0) {
        return jan13Matches[0];
    }

    const jan8Matches = normalized.match(/(?<!\d)\d{8}(?!\d)/g);
    if (jan8Matches && jan8Matches.length > 0) {
        return jan8Matches[0];
    }

    return null;
}

function extractModelNumber(text: string): string | null {
    const normalized = text.normalize('NFKC');

    const patterns = [
        /\b[A-Z]{1,6}[-‐]?[A-Z0-9]{2,}\b/gi,
        /\b[A-Z]+[-‐]?\d{4,}[A-Z0-9-]*\b/gi,
        /\b[A-Z]{2,}\d{2,}[A-Z0-9-]*\b/gi,
    ];

    const candidates = patterns.flatMap(
        (pattern) => normalized.match(pattern) ?? [],
    );

    if (candidates.length === 0) {
        return null;
    }

    const excludedWords = new Set(['kg', 'ml', 'pcs', 'sale']);

    const filtered = candidates
        .map((value) => value.trim())
        .filter((value) => value.length >= 4)
        .filter((value) => !excludedWords.has(value.toLowerCase()));

    if (filtered.length === 0) {
        return null;
    }

    filtered.sort((a, b) => b.length - a.length);

    return filtered[0];
}

async function resolveBrandId(itemName: string): Promise<bigint | null> {
    const normalizedItemName = itemName.normalize('NFKC').toLowerCase();

    const rules = await prisma.brandRule.findMany({
        where: {
            isActive: true,
        },
        include: {
            brand: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    const sortedRules = rules.sort((a, b) => {
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }

        return b.keyword.length - a.keyword.length;
    });

    for (const rule of sortedRules) {
        const normalizedKeyword = rule.keyword.normalize('NFKC').toLowerCase();

        if (normalizedItemName.includes(normalizedKeyword)) {
            return rule.brand.id;
        }
    }

    return null;
}

async function findOrCreateProduct(params: {
    categoryId: bigint;
    itemName: string;
    petType: string;
    imageUrl: string | null;
    itemCaption?: string | null;
}): Promise<{ id: bigint }> {
    const sourceText = [params.itemName, params.itemCaption ?? ''].join(' ');
    const normalizedName = normalizeProductName(params.itemName);
    const packageSize = extractPackageSize(params.itemName);
    const brandId = await resolveBrandId(params.itemName);
    const janCode = extractJanCode(sourceText);
    const modelNumber = extractModelNumber(sourceText);

    if (janCode) {
        const janMatch = await prisma.product.findFirst({
            where: {
                janCode,
            },
            select: {
                id: true,
            },
        });

        if (janMatch) {
            return janMatch;
        }
    }

    if (modelNumber) {
        const modelMatch = await prisma.product.findFirst({
            where: {
                modelNumber,
                ...(brandId ? { brandId } : {}),
            },
            select: {
                id: true,
            },
        });

        if (modelMatch) {
            return modelMatch;
        }
    }

    const exactMatch = await prisma.product.findFirst({
        where: {
            categoryId: params.categoryId,
            petType: params.petType,
            normalizedName,
            packageSize,
            ...(brandId ? { brandId } : {}),
        },
        select: {
            id: true,
        },
    });

    if (exactMatch) {
        return exactMatch;
    }

    const normalizedMatch = await prisma.product.findFirst({
        where: {
            categoryId: params.categoryId,
            petType: params.petType,
            normalizedName,
            ...(brandId ? { brandId } : {}),
        },
        select: {
            id: true,
        },
    });

    if (normalizedMatch) {
        return normalizedMatch;
    }

    const looseCandidates = await prisma.product.findMany({
        where: {
            categoryId: params.categoryId,
            petType: params.petType,
            ...(brandId ? { brandId } : {}),
        },
        select: {
            id: true,
            normalizedName: true,
            packageSize: true,
        },
        take: 50,
    });

    const looseMatch = looseCandidates.find((product) => {
        if (!product.normalizedName) {
            return false;
        }

        const samePackage =
            !packageSize ||
            !product.packageSize ||
            product.packageSize === packageSize;

        if (!samePackage) {
            return false;
        }

        return (
            product.normalizedName.includes(normalizedName) ||
            normalizedName.includes(product.normalizedName)
        );
    });

    if (looseMatch) {
        return { id: looseMatch.id };
    }

    return prisma.product.create({
        data: {
            category: {
                connect: { id: params.categoryId },
            },
            ...(brandId
                ? {
                    brand: {
                        connect: { id: brandId },
                    },
                }
                : {}),
            name: params.itemName,
            normalizedName,
            janCode,
            modelNumber,
            petType: params.petType,
            packageSize,
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

        console.log(
            `fetching category=${category.code}, keyword=${target.keyword}`,
        );

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
                const brandId = await resolveBrandId(item.itemName);
                const sourceText = [item.itemName, item.itemCaption ?? ''].join(' ');
                const janCode = extractJanCode(sourceText);
                const modelNumber = extractModelNumber(sourceText);

                await prisma.product.update({
                    where: {
                        id: productId,
                    },
                    data: {
                        ...(brandId ? { brandId } : {}),
                        name: item.itemName,
                        normalizedName: normalizeProductName(item.itemName),
                        janCode,
                        modelNumber,
                        petType: target.petType,
                        packageSize: extractPackageSize(item.itemName),
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

                const shouldCreateHistory = (() => {
                    console.log('--- history check start ---');
                    console.log('offerId:', existingOffer.id.toString());
                    console.log('itemCode:', item.itemCode);
                    console.log('itemName:', item.itemName);
                    console.log('now:', now.toISOString());

                    if (!latestHistory) {
                        console.log('latestHistory: none -> create');
                        console.log('--- history check end ---');
                        return true;
                    }

                    const latestTime = new Date(latestHistory.fetchedAt).getTime();
                    const nowTime = now.getTime();
                    const hoursDiff = (nowTime - latestTime) / (1000 * 60 * 60);

                    const priceChanged =
                        latestHistory.price !== item.itemPrice ||
                        latestHistory.effectivePrice !== effectivePrice;

                    console.log('latest fetchedAt:', latestHistory.fetchedAt);
                    console.log('hoursDiff:', hoursDiff);
                    console.log('latest price:', latestHistory.price);
                    console.log('current price:', item.itemPrice);
                    console.log(
                        'latest effectivePrice:',
                        latestHistory.effectivePrice,
                    );
                    console.log('current effectivePrice:', effectivePrice);
                    console.log('priceChanged:', priceChanged);

                    if (priceChanged) {
                        console.log('price changed -> create');
                        console.log('--- history check end ---');
                        return true;
                    }

                    if (hoursDiff >= 6) {
                        console.log('6 hours passed -> create');
                        console.log('--- history check end ---');
                        return true;
                    }

                    console.log('skip create');
                    console.log('--- history check end ---');
                    return false;
                })();

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

                    console.log(
                        'priceHistory created for offerId=',
                        existingOffer.id.toString(),
                    );
                }

                console.log(
                    `updated offer: ${item.itemCode} / ${item.itemName} / price=${item.itemPrice}`,
                );
            } else {
                const product = await findOrCreateProduct({
                    categoryId: category.id,
                    itemName: item.itemName,
                    itemCaption: item.itemCaption ?? null,
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

        await sleep(2000);
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