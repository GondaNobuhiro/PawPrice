import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q')?.trim() ?? '';
    const category = searchParams.get('category')?.trim() ?? '';
    const sort = searchParams.get('sort')?.trim() ?? 'newest';
    const petType = searchParams.get('petType')?.trim() ?? '';

    const products = await prisma.product.findMany({
        where: {
            isActive: true,
            ...(q
                ? {
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { normalizedName: { contains: q, mode: 'insensitive' } },
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
        },
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

    return NextResponse.json(mapped);
}