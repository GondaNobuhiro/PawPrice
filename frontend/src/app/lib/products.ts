import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

const PAGE_SIZE = 20;

export type ProductItem = {
    id: string;
    name: string;
    imageUrl: string | null;
    brand: string | null;
    category: string;
    subCategory: string | null;
    packageSize: string | null;
    petType: string;
    offersCount: number;
    lowestOffer: {
        id: string;
        shopType: string;
        sellerName: string | null;
        price: number;
        shippingFee: number | null;
        pointAmount: number;
        effectivePrice: number;
        externalUrl: string;
        imageUrl: string | null;
        lastFetchedAt: string;
    } | null;
    priceSummary: {
        isPriceDown: boolean;
        latestEffectivePrice: number | null;
        historicalMinPrice: number | null;
        previousEffectivePrice: null;
        diffAmount: null;
        diffPercent: null;
    };
};

export type ProductsResult = {
    items: ProductItem[];
    pagination: {
        page: number;
        pageSize: number;
        totalCount: number;
        totalPages: number;
    };
};

async function fetchProducts(params: {
    q: string;
    categoryId: string;
    sort: string;
    petType: string;
    page: string;
}): Promise<ProductsResult> {
    const { q, categoryId, sort, petType } = params;
    const pageNum = Number(params.page ?? '1');
    const currentPage = Number.isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;

    let targetCategoryIds: bigint[] | undefined = undefined;

    if (categoryId) {
        const selectedCategory = await prisma.category.findUnique({
            where: { id: BigInt(categoryId) },
            select: {
                id: true,
                parentCategoryId: true,
                children: { select: { id: true } },
            },
        });

        if (selectedCategory) {
            // 親カテゴリ: 自身 + 直接の子カテゴリ
            // 子カテゴリ: 自身 + その子カテゴリ（孫まで含む）
            targetCategoryIds = [
                selectedCategory.id,
                ...selectedCategory.children.map((c) => c.id),
            ];
        }
    }

    const where = {
        isActive: true,
        offers: { some: { isActive: true } },
        ...(q ? { OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { normalizedName: { contains: q, mode: 'insensitive' as const } },
        ]} : {}),
        ...(targetCategoryIds ? { categoryId: { in: targetCategoryIds } } : {}),
        ...(petType ? { petType: { in: [petType, 'both'] } } : {}),
    };

    let totalCount: number;
    if (sort === 'price_down') {
        const matchingIds = await prisma.product.findMany({ where, select: { id: true } });
        if (matchingIds.length > 0) {
            const ids = matchingIds.map((p) => p.id);
            const rows = await prisma.$queryRaw<{ count: bigint }[]>`
                WITH cheapest AS (
                    SELECT DISTINCT ON (product_id) id AS offer_id
                    FROM product_offers
                    WHERE is_active = true AND product_id = ANY(${ids}::bigint[])
                    ORDER BY product_id, effective_price ASC
                ),
                ranked AS (
                    SELECT
                        ph.product_offer_id AS offer_id,
                        ph.effective_price,
                        ROW_NUMBER() OVER (PARTITION BY ph.product_offer_id ORDER BY ph.fetched_at DESC) AS rn
                    FROM price_histories ph
                    JOIN cheapest c ON c.offer_id = ph.product_offer_id
                ),
                dropped_offers AS (
                    SELECT offer_id
                    FROM ranked
                    WHERE rn <= 2
                    GROUP BY offer_id
                    HAVING COUNT(*) = 2
                       AND MAX(CASE WHEN rn = 1 THEN effective_price END)
                         < MAX(CASE WHEN rn = 2 THEN effective_price END)
                )
                SELECT COUNT(DISTINCT o.product_id) AS count
                FROM product_offers o
                JOIN dropped_offers d ON d.offer_id = o.id
                WHERE o.is_active = true
                  AND o.product_id = ANY(${ids}::bigint[])
            `;
            totalCount = Number(rows[0]?.count ?? 0);
        } else {
            totalCount = 0;
        }
    } else {
        totalCount = await prisma.product.count({ where });
    }

    let orderedIds: bigint[] | null = null;
    if (sort === 'price_asc') {
        const matchingIds = await prisma.product.findMany({ where, select: { id: true } });
        if (matchingIds.length > 0) {
            const ids = matchingIds.map((p) => p.id);
            const rows = await prisma.$queryRaw<{ id: bigint }[]>`
                SELECT p.id
                FROM products p
                LEFT JOIN product_offers o ON o.product_id = p.id AND o.is_active = true
                WHERE p.id = ANY(${ids}::bigint[])
                GROUP BY p.id
                ORDER BY MIN(o.effective_price) ASC NULLS LAST
                LIMIT ${PAGE_SIZE} OFFSET ${(currentPage - 1) * PAGE_SIZE}
            `;
            orderedIds = rows.map((r) => r.id);
        } else {
            orderedIds = [];
        }
    } else if (sort === 'price_down') {
        const matchingIds = await prisma.product.findMany({ where, select: { id: true } });
        if (matchingIds.length > 0) {
            const ids = matchingIds.map((p) => p.id);
            const rows = await prisma.$queryRaw<{ id: bigint }[]>`
                WITH cheapest AS (
                    SELECT DISTINCT ON (product_id) id AS offer_id
                    FROM product_offers
                    WHERE is_active = true AND product_id = ANY(${ids}::bigint[])
                    ORDER BY product_id, effective_price ASC
                ),
                ranked AS (
                    SELECT
                        ph.product_offer_id AS offer_id,
                        ph.effective_price,
                        ROW_NUMBER() OVER (PARTITION BY ph.product_offer_id ORDER BY ph.fetched_at DESC) AS rn
                    FROM price_histories ph
                    JOIN cheapest c ON c.offer_id = ph.product_offer_id
                ),
                dropped_offers AS (
                    SELECT offer_id
                    FROM ranked
                    WHERE rn <= 2
                    GROUP BY offer_id
                    HAVING COUNT(*) = 2
                       AND MAX(CASE WHEN rn = 1 THEN effective_price END)
                         < MAX(CASE WHEN rn = 2 THEN effective_price END)
                )
                SELECT DISTINCT o.product_id AS id
                FROM product_offers o
                JOIN dropped_offers d ON d.offer_id = o.id
                WHERE o.is_active = true
                  AND o.product_id = ANY(${ids}::bigint[])
                ORDER BY id DESC
                LIMIT ${PAGE_SIZE} OFFSET ${(currentPage - 1) * PAGE_SIZE}
            `;
            orderedIds = rows.map((r) => r.id);
        } else {
            orderedIds = [];
        }
    }

    const products = orderedIds !== null && orderedIds.length === 0 ? [] : await prisma.product.findMany({
        where: orderedIds ? { id: { in: orderedIds } } : where,
        skip: orderedIds ? undefined : (currentPage - 1) * PAGE_SIZE,
        take: orderedIds ? undefined : PAGE_SIZE,
        orderBy: orderedIds ? undefined : { createdAt: 'desc' },
        include: {
            category: {
                select: {
                    id: true,
                    name: true,
                    parentCategoryId: true,
                    parent: { select: { id: true, name: true } },
                },
            },
            brand: { select: { id: true, name: true } },
            offers: {
                where: { isActive: true },
                orderBy: { effectivePrice: 'asc' },
                take: 1,
                select: {
                    id: true,
                    shopType: true,
                    sellerName: true,
                    price: true,
                    shippingFee: true,
                    pointAmount: true,
                    effectivePrice: true,
                    externalUrl: true,
                    imageUrl: true,
                    lastFetchedAt: true,
                    priceHistories: {
                        orderBy: { fetchedAt: 'desc' },
                        take: 2,
                        select: { effectivePrice: true },
                    },
                },
            },
            _count: { select: { offers: { where: { isActive: true } } } },
        },
    });

    const sortedProducts = orderedIds
        ? orderedIds.map((id) => products.find((p) => p.id === id)!).filter(Boolean)
        : products;

    const productIds = sortedProducts.map((p) => p.id);
    const historicalMins = productIds.length > 0
        ? await prisma.$queryRaw<{ product_id: bigint; min_price: number }[]>`
            SELECT po.product_id, MIN(ph.effective_price) AS min_price
            FROM product_offers po
            JOIN price_histories ph ON ph.product_offer_id = po.id
            WHERE po.product_id = ANY(${productIds}::bigint[])
            GROUP BY po.product_id
          `
        : [];
    const historicalMinMap = new Map(historicalMins.map((r) => [r.product_id.toString(), r.min_price]));

    const items: ProductItem[] = sortedProducts.map((product) => {
        const rawOffer = product.offers[0];
        const lowestOffer = rawOffer
            ? {
                id: rawOffer.id.toString(),
                shopType: rawOffer.shopType,
                sellerName: rawOffer.sellerName,
                price: rawOffer.price,
                shippingFee: rawOffer.shippingFee,
                pointAmount: rawOffer.pointAmount,
                effectivePrice: rawOffer.effectivePrice,
                externalUrl: rawOffer.externalUrl,
                imageUrl: rawOffer.imageUrl,
                lastFetchedAt: rawOffer.lastFetchedAt.toISOString(),
            }
            : null;

        const histories = rawOffer?.priceHistories ?? [];
        const isPriceDown =
            histories.length >= 2 && histories[0].effectivePrice < histories[1].effectivePrice;

        return {
            id: product.id.toString(),
            name: product.name,
            imageUrl: product.imageUrl,
            brand: product.brand?.name ?? null,
            category: product.category.parent?.name ?? product.category.name,
            subCategory: product.category.parent ? product.category.name : null,
            packageSize: product.packageSize,
            petType: product.petType,
            offersCount: product._count.offers,
            lowestOffer,
            priceSummary: {
                isPriceDown,
                latestEffectivePrice: lowestOffer?.effectivePrice ?? null,
                historicalMinPrice: historicalMinMap.get(product.id.toString()) ?? lowestOffer?.effectivePrice ?? null,
                previousEffectivePrice: null,
                diffAmount: null,
                diffPercent: null,
            },
        };
    });

    return {
        items,
        pagination: {
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalCount,
            totalPages: Math.ceil(totalCount / PAGE_SIZE),
        },
    };
}

export function getProducts(params: {
    q?: string;
    categoryId?: string;
    sort?: string;
    petType?: string;
    page?: string;
}): Promise<ProductsResult> {
    const q = params.q?.trim() ?? '';
    const categoryId = params.categoryId?.trim() ?? '';
    const sort = params.sort?.trim() ?? 'newest';
    const petType = params.petType?.trim() ?? '';
    const page = params.page ?? '1';

    return unstable_cache(
        () => fetchProducts({ q, categoryId, sort, petType, page }),
        ['products', q, categoryId, sort, petType, page],
        { revalidate: 300 }, // 5分キャッシュ
    )();
}

export type ProductDetail = {
    id: string;
    name: string;
    category: string;
    brand: string | null;
    petType: string;
    packageSize: string | null;
    imageUrl: string | null;
    description: string | null;
    offers: {
        id: string;
        shopType: string;
        title: string | null;
        price: number;
        shippingFee: number | null;
        pointAmount: number;
        effectivePrice: number;
        externalUrl: string;
        sellerName: string | null;
        availabilityStatus: string | null;
        priceHistories: {
            id: string;
            price: number;
            effectivePrice: number;
            fetchedAt: string;
        }[];
    }[];
};

export function getProduct(id: string): Promise<ProductDetail | null> {
    return unstable_cache(
        () => fetchProduct(id),
        ['product', id],
        { revalidate: 1800 }, // 30分キャッシュ
    )();
}

async function fetchProduct(id: string): Promise<ProductDetail | null> {
    const product = await prisma.product.findUnique({
        where: { id: BigInt(id) },
        include: {
            category: true,
            brand: true,
            offers: {
                where: {
                    isActive: true,
                    lastFetchedAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                },
                orderBy: { effectivePrice: 'asc' },
                include: {
                    priceHistories: {
                        orderBy: { fetchedAt: 'desc' },
                        take: 10,
                    },
                },
            },
        },
    });

    if (!product) return null;

    return {
        id: product.id.toString(),
        name: product.name,
        category: product.category.name,
        brand: product.brand?.name ?? null,
        petType: product.petType,
        packageSize: product.packageSize,
        imageUrl: product.imageUrl,
        description: product.description,
        offers: product.offers.map((offer) => ({
            id: offer.id.toString(),
            shopType: offer.shopType,
            title: offer.title,
            price: offer.price,
            shippingFee: offer.shippingFee,
            pointAmount: offer.pointAmount,
            effectivePrice: offer.effectivePrice,
            externalUrl: offer.externalUrl,
            sellerName: offer.sellerName,
            availabilityStatus: offer.availabilityStatus,
            priceHistories: offer.priceHistories.map((h) => ({
                id: h.id.toString(),
                price: h.price,
                effectivePrice: h.effectivePrice,
                fetchedAt: h.fetchedAt.toISOString(),
            })),
        })),
    };
}
