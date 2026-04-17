import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

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
            },
        },
    });

    const mapped = products.map((product) => ({
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
        lowestOffer: product.offers[0]
            ? {
                shopType: product.offers[0].shopType,
                sellerName: product.offers[0].sellerName,
                title: product.offers[0].title,
                price: product.offers[0].price,
                shippingFee: product.offers[0].shippingFee,
                pointAmount: product.offers[0].pointAmount,
                effectivePrice: product.offers[0].effectivePrice,
                externalUrl: product.offers[0].externalUrl,
            }
            : null,
    }));

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