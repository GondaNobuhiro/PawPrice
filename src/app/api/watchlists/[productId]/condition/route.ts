import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';
import { getSessionUserId } from '@/src/app/lib/session';

type Props = {
    params: Promise<{ productId: string }>;
};

export async function GET(_: Request, { params }: Props) {
    const [{ productId }, userId] = await Promise.all([params, getSessionUserId()]);

    const watchlist = await prisma.watchlist.findUnique({
        where: { userId_productId: { userId, productId: BigInt(productId) } },
        include: {
            watchCondition: true,
            product: {
                include: {
                    offers: { where: { isActive: true }, orderBy: { effectivePrice: 'asc' } },
                },
            },
        },
    });

    if (!watchlist) {
        return NextResponse.json({ message: 'watchlist not found' }, { status: 404 });
    }

    const lowestOffer = watchlist.product.offers[0];
    let historicalLowestPrice: number | null = null;

    if (lowestOffer) {
        const allOfferIds = watchlist.product.offers.map((o) => o.id);
        const historicalLowest = await prisma.priceHistory.findFirst({
            where: { productOfferId: { in: allOfferIds } },
            orderBy: { effectivePrice: 'asc' },
        });
        historicalLowestPrice = historicalLowest
            ? historicalLowest.effectivePrice
            : lowestOffer.effectivePrice;
    }

    if (!watchlist.watchCondition) {
        return NextResponse.json({
            exists: false,
            targetPrice: null,
            notifyOnLowest: false,
            historicalLowestPrice,
            currentPrice: lowestOffer?.effectivePrice ?? null,
            mode: null,
        });
    }

    return NextResponse.json({
        exists: true,
        watchlistId: watchlist.id.toString(),
        targetPrice: watchlist.watchCondition.targetPrice,
        notifyOnLowest: watchlist.watchCondition.notifyOnLowest,
        historicalLowestPrice,
        currentPrice: lowestOffer?.effectivePrice ?? null,
        mode: watchlist.watchCondition.notifyOnLowest ? 'lowest' : 'target',
    });
}

export async function POST(request: Request, { params }: Props) {
    const [{ productId }, userId] = await Promise.all([params, getSessionUserId()]);
    const body = await request.json();

    const mode = body.mode as 'target' | 'lowest' | null;
    const targetPrice =
        body.targetPrice === '' || body.targetPrice === null || body.targetPrice === undefined
            ? null
            : Number(body.targetPrice);

    const watchlist = await prisma.watchlist.findUnique({
        where: { userId_productId: { userId, productId: BigInt(productId) } },
        include: { watchCondition: true },
    });

    if (!watchlist) {
        return NextResponse.json({ message: 'watchlist not found' }, { status: 404 });
    }

    if (watchlist.watchCondition) {
        return NextResponse.json({ message: 'watch condition already exists' }, { status: 409 });
    }

    if (mode !== 'target' && mode !== 'lowest') {
        return NextResponse.json({ message: 'mode is required' }, { status: 400 });
    }

    if (mode === 'target' && targetPrice === null) {
        return NextResponse.json({ message: 'targetPrice is required when mode is target' }, { status: 400 });
    }

    const created = await prisma.watchCondition.create({
        data: {
            watchlist: { connect: { id: watchlist.id } },
            targetPrice: mode === 'target' ? targetPrice : null,
            notifyOnPriceDrop: false,
            notifyOnLowest: mode === 'lowest',
        },
    });

    return NextResponse.json({
        id: created.id.toString(),
        targetPrice: created.targetPrice,
        notifyOnLowest: created.notifyOnLowest,
        mode,
        message: 'watch condition created',
    });
}

export async function DELETE(_: Request, { params }: Props) {
    const [{ productId }, userId] = await Promise.all([params, getSessionUserId()]);

    const watchlist = await prisma.watchlist.findUnique({
        where: { userId_productId: { userId, productId: BigInt(productId) } },
        include: { watchCondition: true },
    });

    if (!watchlist) {
        return NextResponse.json({ message: 'watchlist not found' }, { status: 404 });
    }

    if (!watchlist.watchCondition) {
        return NextResponse.json({ message: 'watch condition does not exist' });
    }

    await prisma.watchCondition.delete({ where: { watchlistId: watchlist.id } });

    return NextResponse.json({ message: 'watch condition deleted' });
}