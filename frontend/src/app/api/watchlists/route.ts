import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';
import { getSessionUserId } from '@/src/app/lib/session';

export async function GET() {
    const userId = await getSessionUserId();
    const watchlists = await prisma.watchlist.findMany({
        where: { userId },
        include: {
            product: {
                include: {
                    category: true,
                    brand: true,
                    offers: { orderBy: { effectivePrice: 'asc' } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
        watchlists.map((watch: (typeof watchlists)[number]) => ({
            id: watch.id.toString(),
            createdAt: watch.createdAt,
            product: {
                id: watch.product.id.toString(),
                name: watch.product.name,
                category: watch.product.category.name,
                brand: watch.product.brand?.name ?? null,
                petType: watch.product.petType,
                packageSize: watch.product.packageSize,
                imageUrl: watch.product.imageUrl,
                lowestOffer: watch.product.offers[0]
                    ? {
                        shopType: watch.product.offers[0].shopType,
                        price: watch.product.offers[0].price,
                        effectivePrice: watch.product.offers[0].effectivePrice,
                        externalUrl: watch.product.offers[0].externalUrl,
                    }
                    : null,
            },
        })),
    );
}

export async function POST(request: Request) {
    const body = await request.json();
    const productId = body.productId;

    if (!productId) {
        return NextResponse.json({ message: 'productId is required' }, { status: 400 });
    }

    const userId = await getSessionUserId();

    const existing = await prisma.watchlist.findUnique({
        where: { userId_productId: { userId, productId: BigInt(productId) } },
        include: { watchCondition: true },
    });

    if (existing) {
        return NextResponse.json({ id: existing.id.toString(), message: 'watchlist already exists' });
    }

    const watchlist = await prisma.watchlist.create({
        data: {
            user: { connect: { id: userId } },
            product: { connect: { id: BigInt(productId) } },
        },
    });

    return NextResponse.json({ id: watchlist.id.toString(), message: 'watchlist added' });
}