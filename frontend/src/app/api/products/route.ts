import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

type HistoryPoint = {
    fetchedAt: Date;
    effectivePrice: number;
};

function getHourlyBucketKey(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:00:00Z`;
}

function buildGroupedMinPrices(histories: HistoryPoint[]) {
    const bucketMap = new Map<
        string,
        {
            fetchedAt: Date;
            minPrice: number;
        }
    >();

    for (const history of histories) {
        const bucketKey = getHourlyBucketKey(history.fetchedAt);

        if (!bucketMap.has(bucketKey)) {
            bucketMap.set(bucketKey, {
                fetchedAt: new Date(bucketKey),
                minPrice: history.effectivePrice,
            });
            continue;
        }

        const current = bucketMap.get(bucketKey)!;
        current.minPrice = Math.min(current.minPrice, history.effectivePrice);
    }

    return Array.from(bucketMap.values()).sort(
        (a, b) => b.fetchedAt.getTime() - a.fetchedAt.getTime(),
    );
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q')?.trim() ?? '';
    const category = searchParams.get('category')?.trim() ?? '';
    const sort = searchParams.get('sort')?.trim() ?? 'newest';
    const petType = searchParams.get('petType')?.trim() ?? '';
    const page = Number(searchParams.get('page') ?? '1');
    const limit = Number(searchParams.get('limit') ?? '20');

    const currentPage = Number.isNaN(page) || page < 1 ? 1 : page;
    const currentLimit = Number.isNaN(limit) || limit < 1 ? 20 : limit;

    const where = {
        isActive: true,
        ...(q
            ? {
                OR: [
                    { name: { contains: q, mode: 'insensitive' as const } },
                    { normalizedName: { contains: q, mode: 'insensitive' as const } },
                ],
            }
            : {}),
        ...(category
            ? {
                category: {
                    code: category,
                },
            }
            : {}),
        ...(petType
            ? {
                petType,
            }
            : {}),
    };

    const products = await prisma.product.findMany({
        where,
        include: {
            category: true,
            brand: true,
            offers: {
                where: {
                    isActive: true,
                },
                orderBy: {
                    effectivePrice: 'asc',
                },
                include: {
                    priceHistories: {
                        orderBy: {
                            fetchedAt: 'desc',
                        },
                        take: 20,
                    },
                },
            },
        },
    });

    const mapped = products.map((product) => {
        const lowestOffer = product.offers[0] ?? null;
        const allHistories = product.offers.flatMap((offer) =>
            offer.priceHistories.map((history) => ({
                fetchedAt: history.fetchedAt,
                effectivePrice: history.effectivePrice,
            })),
        );

        const groupedMinPrices = buildGroupedMinPrices(allHistories);

        const latestSnapshot = groupedMinPrices[0] ?? null;
        const previousSnapshot = groupedMinPrices[1] ?? null;

        const latestEffectivePrice =
            latestSnapshot?.minPrice ?? lowestOffer?.effectivePrice ?? null;

        const historicalMinPrice =
            groupedMinPrices.length > 0
                ? Math.min(...groupedMinPrices.map((snapshot) => snapshot.minPrice))
                : lowestOffer?.effectivePrice ?? null;

        const latestDiffFromPrevious =
            latestSnapshot && previousSnapshot
                ? latestSnapshot.minPrice - previousSnapshot.minPrice
                : null;

        const isPriceDown =
            latestDiffFromPrevious != null && latestDiffFromPrevious < 0;

        return {
            id: product.id.toString(),
            name: product.name,
            category: product.category.name,
            categoryCode: product.category.code,
            brand: product.brand?.name ?? null,
            petType: product.petType,
            packageSize: product.packageSize,
            imageUrl: product.imageUrl,
            createdAt: product.createdAt,
            offersCount: product.offers.length,
            lowestOffer: lowestOffer
                ? {
                    shopType: lowestOffer.shopType,
                    sellerName: lowestOffer.sellerName,
                    title: lowestOffer.title,
                    price: lowestOffer.price,
                    shippingFee: lowestOffer.shippingFee,
                    pointAmount: lowestOffer.pointAmount,
                    effectivePrice: lowestOffer.effectivePrice,
                    externalUrl: lowestOffer.externalUrl,
                }
                : null,
            priceSummary: {
                latestEffectivePrice,
                historicalMinPrice,
                latestDiffFromPrevious,
                isPriceDown,
            },
        };
    });

    if (sort === 'price_asc') {
        mapped.sort((a, b) => {
            const aPrice = a.lowestOffer?.effectivePrice ?? Number.MAX_SAFE_INTEGER;
            const bPrice = b.lowestOffer?.effectivePrice ?? Number.MAX_SAFE_INTEGER;
            return aPrice - bPrice;
        });
    } else {
        mapped.sort(
            (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }

    const totalCount = mapped.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / currentLimit));
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * currentLimit;
    const end = start + currentLimit;

    const paginated = mapped.slice(start, end);

    return NextResponse.json({
        items: paginated,
        pagination: {
            page: safePage,
            limit: currentLimit,
            totalCount,
            totalPages,
            hasPreviousPage: safePage > 1,
            hasNextPage: safePage < totalPages,
        },
    });
}