import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
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
        previousEffectivePrice: number | null;
        diffAmount: number | null;
        diffPercent: number | null;
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

    const qFilter = q
        ? Prisma.sql`AND (p.name ILIKE ${'%' + q + '%'} OR p.normalized_name ILIKE ${'%' + q + '%'})`
        : Prisma.empty;
    const categoryFilter = targetCategoryIds
        ? Prisma.sql`AND p.category_id = ANY(${targetCategoryIds}::bigint[])`
        : Prisma.empty;
    const petTypeFilter = petType
        ? Prisma.sql`AND p.pet_type = ANY(${[petType, 'both']}::text[])`
        : Prisma.empty;

    const offset = (currentPage - 1) * PAGE_SIZE;
    let totalCount = 0;
    let orderedIds: bigint[] = [];

    if (sort === 'price_asc') {
        // COUNT(*) OVER() は全行 materialize を強制するため分離して実行
        const countRows = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*) AS count
            FROM products p
            WHERE p.is_active = true
              ${qFilter}
              ${categoryFilter}
              ${petTypeFilter}
              AND EXISTS (
                SELECT 1 FROM product_offers po
                WHERE po.product_id = p.id AND po.is_active = true
              )
        `;
        totalCount = Number(countRows[0]?.count ?? 0);

        const pageRows = await prisma.$queryRaw<{ id: bigint }[]>`
            SELECT p.id
            FROM products p
            JOIN product_offers po ON po.product_id = p.id AND po.is_active = true
            WHERE p.is_active = true
              ${qFilter}
              ${categoryFilter}
              ${petTypeFilter}
            GROUP BY p.id
            ORDER BY MIN(po.effective_price) ASC NULLS LAST
            LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `;
        orderedIds = pageRows.map((r) => r.id);
    } else if (sort === 'price_down') {
        const rows = await prisma.$queryRaw<{ id: bigint; total_count: bigint }[]>`
            WITH cheapest AS (
                SELECT DISTINCT ON (po.product_id)
                    po.id    AS offer_id,
                    po.product_id
                FROM product_offers po
                JOIN products p ON p.id = po.product_id
                WHERE po.is_active = true
                  AND p.is_active = true
                  ${qFilter}
                  ${categoryFilter}
                  ${petTypeFilter}
                ORDER BY po.product_id, po.effective_price ASC
            ),
            ph_pair AS (
                SELECT
                    c.offer_id,
                    c.product_id,
                    ph.effective_price,
                    ROW_NUMBER() OVER (PARTITION BY c.offer_id ORDER BY ph.fetched_at DESC) AS rn
                FROM cheapest c
                JOIN LATERAL (
                    SELECT effective_price, fetched_at
                    FROM price_histories
                    WHERE product_offer_id = c.offer_id
                    ORDER BY fetched_at DESC
                    LIMIT 2
                ) ph ON true
            ),
            dropped AS (
                SELECT
                    product_id,
                    MAX(CASE WHEN rn = 1 THEN effective_price END) AS cur,
                    MAX(CASE WHEN rn = 2 THEN effective_price END) AS prev
                FROM ph_pair
                GROUP BY product_id
                HAVING COUNT(*) = 2
                   AND MAX(CASE WHEN rn = 1 THEN effective_price END)
                     < MAX(CASE WHEN rn = 2 THEN effective_price END)
            )
            SELECT
                product_id                              AS id,
                COUNT(*) OVER ()                        AS total_count
            FROM dropped
            ORDER BY (prev - cur)::numeric / NULLIF(prev, 0) DESC
            LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `;
        totalCount = Number(rows[0]?.total_count ?? 0);
        orderedIds = rows.map((r) => r.id);
    } else {
        // newest: created_at インデックスを使うため EXISTS に変更、COUNT も分離
        const countRows = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*) AS count
            FROM products p
            WHERE p.is_active = true
              ${qFilter}
              ${categoryFilter}
              ${petTypeFilter}
              AND EXISTS (
                SELECT 1 FROM product_offers po
                WHERE po.product_id = p.id AND po.is_active = true
              )
        `;
        totalCount = Number(countRows[0]?.count ?? 0);

        const pageRows = await prisma.$queryRaw<{ id: bigint }[]>`
            SELECT p.id
            FROM products p
            WHERE p.is_active = true
              ${qFilter}
              ${categoryFilter}
              ${petTypeFilter}
              AND EXISTS (
                SELECT 1 FROM product_offers po
                WHERE po.product_id = p.id AND po.is_active = true
              )
            ORDER BY p.created_at DESC
            LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `;
        orderedIds = pageRows.map((r) => r.id);
    }

    const products = orderedIds.length === 0 ? [] : await prisma.product.findMany({
        where: { id: { in: orderedIds } },
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

    const sortedProducts = orderedIds.map((id) => products.find((p) => p.id === id)!).filter(Boolean);

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
        const prevPrice = isPriceDown ? histories[1].effectivePrice : null;
        const diffAmount = isPriceDown ? histories[1].effectivePrice - histories[0].effectivePrice : null;
        const diffPercent = isPriceDown && histories[1].effectivePrice > 0
            ? Math.round((histories[1].effectivePrice - histories[0].effectivePrice) / histories[1].effectivePrice * 1000) / 10
            : null;

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
                previousEffectivePrice: prevPrice,
                diffAmount,
                diffPercent,
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
        { revalidate: 1800 }, // 30分キャッシュ
    )();
}

export type ProductDetail = {
    id: string;
    name: string;
    normalizedName: string | null;
    category: string;
    brand: string | null;
    petType: string;
    packageSize: string | null;
    imageUrl: string | null;
    description: string | null;
    janCode: string | null;
    modelNumber: string | null;
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
        normalizedName: product.normalizedName,
        category: product.category.name,
        brand: product.brand?.name ?? null,
        petType: product.petType,
        packageSize: product.packageSize,
        imageUrl: product.imageUrl,
        description: product.description,
        janCode: product.janCode,
        modelNumber: product.modelNumber,
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
