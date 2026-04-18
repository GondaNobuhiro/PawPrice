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

if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}
if (!applicationId) {
    throw new Error('RAKUTEN_APPLICATION_ID is not set');
}
if (!accessKey) {
    throw new Error('RAKUTEN_ACCESS_KEY is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(new Pool({ connectionString })),
});

const MAX_GENRES = 200;
const HITS_PER_PAGE = 30;
const DEFAULT_MAX_PAGES_PER_GENRE = 3;
const MAJOR_MAX_PAGES_PER_GENRE = 20;

type RakutenItemRaw =
    | {
    itemName?: string;
    itemCode?: string;
    itemPrice?: number;
    itemUrl?: string;
    shopName?: string;
    itemCaption?: string;
    mediumImageUrls?: string[];
    genreId?: number;
    Item?: {
        itemName?: string;
        itemCode?: string;
        itemPrice?: number;
        itemUrl?: string;
        shopName?: string;
        itemCaption?: string;
        mediumImageUrls?: string[];
        genreId?: number;
    };
}
    | null
    | undefined;

type RakutenItem = {
    itemName: string;
    itemCode: string;
    itemPrice: number;
    itemUrl: string;
    shopName: string;
    itemCaption?: string;
    mediumImageUrls?: string[];
    genreId?: number;
};

type RakutenSearchResponse = {
    Items?: RakutenItemRaw[];
    items?: RakutenItemRaw[];
    count?: number;
    page?: number;
    pageCount?: number;
    hits?: number;
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeProductName(name: string | null | undefined): string {
    if (!name) {
        return '';
    }

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
        .replace(/[|｜/／・●◆★☆※■□▲△▼▽◆]/g, ' ')
        .replace(/[,:：;；]/g, ' ')
        .replace(/[-‐-‒–—―]/g, ' ')
        .replace(/[!"#$%&'*=~^`{}<>?＋+]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function inferPetType(text: string): string {
    if (/犬|ドッグ|dog/i.test(text)) return 'dog';
    if (/猫|キャット|cat/i.test(text)) return 'cat';
    return 'both';
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

function normalizeRakutenItems(rawItems: RakutenItemRaw[]): RakutenItem[] {
    const result: RakutenItem[] = [];

    for (const raw of rawItems) {
        if (!raw) continue;

        const base = raw.Item ?? raw;

        if (
            !base.itemCode ||
            !base.itemName ||
            typeof base.itemPrice !== 'number' ||
            !base.itemUrl ||
            !base.shopName
        ) {
            console.warn('skip rakuten item: invalid shape', raw);
            continue;
        }

        result.push({
            itemCode: base.itemCode,
            itemName: base.itemName,
            itemPrice: base.itemPrice,
            itemUrl: base.itemUrl,
            shopName: base.shopName,
            itemCaption: base.itemCaption,
            mediumImageUrls: base.mediumImageUrls ?? [],
            genreId: base.genreId,
        });
    }

    return result;
}

async function fetchGenreItems(
    genreId: string,
    page: number,
    retryCount = 0,
): Promise<RakutenItem[]> {
    const params = new URLSearchParams();
    params.set('applicationId', applicationId!);
    params.set('accessKey', accessKey!);
    params.set('format', 'json');
    params.set('formatVersion', '2');
    params.set('genreId', genreId);
    params.set('hits', String(HITS_PER_PAGE));
    params.set('page', String(page));
    params.set(
        'elements',
        'itemName,itemCode,itemPrice,itemUrl,shopName,itemCaption,mediumImageUrls,genreId',
    );

    if (affiliateId) {
        params.set('affiliateId', affiliateId);
    }

    const url = `${apiBaseUrl}?${params.toString()}`;

    try {
        const res = await fetch(url, {
            headers: {
                Referer: 'https://pawprice.vercel.app/',
                Origin: 'https://pawprice.vercel.app',
                'User-Agent': 'PawPrice/0.1',
            },
        });

        const text = await res.text();

        if (res.status === 429) {
            if (retryCount >= 5) {
                console.error('genre item search status=', res.status);
                console.error(text);
                throw new Error('Genre item search rate limit exceeded after retries');
            }

            console.warn(
                `Genre item search rate limit hit. genreId=${genreId}, page=${page}, retry=${retryCount + 1}`,
            );
            await sleep(3000 + retryCount * 1000);
            return fetchGenreItems(genreId, page, retryCount + 1);
        }

        if (!res.ok) {
            console.error('genre item search status=', res.status);
            console.error(text);
            throw new Error(`Genre item search failed: ${res.status}`);
        }

        const data = JSON.parse(text) as RakutenSearchResponse;

        const rawItems = Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.Items)
                ? data.Items
                : [];

        return normalizeRakutenItems(rawItems);
    } catch (error) {
        if (retryCount >= 5) {
            throw error;
        }

        console.warn(
            `Genre item search network error. genreId=${genreId}, page=${page}, retry=${retryCount + 1}`,
            error,
        );
        await sleep(3000 + retryCount * 1000);
        return fetchGenreItems(genreId, page, retryCount + 1);
    }
}

async function ensureCategoryFromGenre(genreName: string) {
    const code = `rakuten_genre_${normalizeProductName(genreName)
        .replace(/\s+/g, '_')
        .slice(0, 40)}`;

    return prisma.category.upsert({
        where: { code },
        update: {
            name: genreName,
        },
        create: {
            code,
            name: genreName,
        },
        select: {
            id: true,
            code: true,
            name: true,
        },
    });
}

async function findOrCreateProduct(params: {
    categoryId: bigint;
    itemName: string;
    itemCaption?: string | null;
    petType: string;
    imageUrl: string | null;
}): Promise<{ id: bigint; created: boolean }> {
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
            return { id: janMatch.id, created: false };
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
            return { id: modelMatch.id, created: false };
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
        return { id: exactMatch.id, created: false };
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
        return { id: normalizedMatch.id, created: false };
    }

    const created = await prisma.product.create({
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

    return { id: created.id, created: true };
}

function isMajorGenre(genreName: string): boolean {
    return /フード|ドッグフード|キャットフード|猫砂|ペットシーツ|シーツ|トイレ|おやつ|ミルク|サプリ/i.test(
        genreName,
    );
}

function getMaxPagesForGenre(genreName: string): number {
    return isMajorGenre(genreName)
        ? MAJOR_MAX_PAGES_PER_GENRE
        : DEFAULT_MAX_PAGES_PER_GENRE;
}

async function main() {
    const genres = await prisma.genre.findMany({
        where: {
            platform: 'rakuten',
            isPetGenre: true,
            isActive: true,
            name: {
                notIn: ['その他'],
            },
        },
        orderBy: [{ level: 'asc' }, { externalGenreId: 'asc' }],
        take: MAX_GENRES,
    });

    console.log(`target genres: ${genres.length}`);

    let createdProducts = 0;
    let createdOffers = 0;
    let createdHistories = 0;
    let skippedExistingOffers = 0;
    let skippedDuplicateInRun = 0;
    let totalFetchedItems = 0;
    let processedItems = 0;

    const seenItemCodes = new Set<string>();

    for (const genre of genres) {
        const maxPages = getMaxPagesForGenre(genre.name);

        console.log(
            `import genre items for genre=${genre.name} (${genre.externalGenreId}), maxPages=${maxPages}`,
        );

        const category = await ensureCategoryFromGenre(genre.name);

        for (let page = 1; page <= maxPages; page += 1) {
            const items = await fetchGenreItems(genre.externalGenreId, page);

            console.log(
                `genre items fetched: ${items.length} for genre=${genre.name}, page=${page}/${maxPages}`,
            );

            totalFetchedItems += items.length;

            if (items.length === 0) {
                break;
            }

            for (const item of items) {
                processedItems += 1;

                if (seenItemCodes.has(item.itemCode)) {
                    skippedDuplicateInRun += 1;
                    console.log(`skip duplicate itemCode in current run: ${item.itemCode}`);
                    continue;
                }
                seenItemCodes.add(item.itemCode);

                const existingOffer = await prisma.productOffer.findUnique({
                    where: {
                        shopType_externalItemId: {
                            shopType: 'rakuten',
                            externalItemId: item.itemCode,
                        },
                    },
                    select: {
                        id: true,
                    },
                });

                if (existingOffer) {
                    skippedExistingOffers += 1;
                    console.log(`skip existing offer: ${item.itemCode}`);
                    continue;
                }

                const normalizedName = normalizeProductName(item.itemName);
                if (!normalizedName) {
                    console.warn('skip item: normalizedName empty', item);
                    continue;
                }

                const imageUrl = item.mediumImageUrls?.[0] ?? null;
                const petType = inferPetType(
                    [item.itemName, item.itemCaption ?? '', genre.name].join(' '),
                );

                const productResult = await findOrCreateProduct({
                    categoryId: category.id,
                    itemName: item.itemName,
                    itemCaption: item.itemCaption ?? null,
                    petType,
                    imageUrl,
                });

                if (productResult.created) {
                    createdProducts += 1;
                }

                const now = new Date();

                const offer = await prisma.productOffer.create({
                    data: {
                        product: {
                            connect: { id: productResult.id },
                        },
                        shopType: 'rakuten',
                        externalItemId: item.itemCode,
                        externalUrl: item.itemUrl,
                        title: item.itemName,
                        sellerName: item.shopName,
                        price: item.itemPrice,
                        shippingFee: 0,
                        pointAmount: 0,
                        effectivePrice: item.itemPrice,
                        imageUrl,
                        lastFetchedAt: now,
                        isActive: true,
                    },
                    select: {
                        id: true,
                    },
                });
                createdOffers += 1;

                await prisma.priceHistory.create({
                    data: {
                        productOffer: {
                            connect: { id: offer.id },
                        },
                        price: item.itemPrice,
                        shippingFee: 0,
                        pointAmount: 0,
                        effectivePrice: item.itemPrice,
                        fetchedAt: now,
                    },
                });
                createdHistories += 1;

                console.log(
                    `created offer: genre=${genre.name}, itemCode=${item.itemCode}, productId=${productResult.id.toString()}`,
                );
            }

            await sleep(1500);
        }

        await sleep(2000);
    }

    console.log('genre item import done');
    console.log({
        targetGenres: genres.length,
        totalFetchedItems,
        processedItems,
        createdProducts,
        createdOffers,
        createdHistories,
        skippedExistingOffers,
        skippedDuplicateInRun,
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });