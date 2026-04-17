import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

const DEMO_USER_ID = BigInt(1);

type Props = {
    params: Promise<{
        productId: string;
    }>;
};

export async function DELETE(_: Request, { params }: Props) {
    const { productId } = await params;

    const watchlist = await prisma.watchlist.findUnique({
        where: {
            userId_productId: {
                userId: DEMO_USER_ID,
                productId: BigInt(productId),
            },
        },
        include: {
            watchCondition: true,
        },
    });

    if (!watchlist) {
        return NextResponse.json({
            message: 'watchlist not found',
        });
    }

    await prisma.$transaction(async (tx) => {
        if (watchlist.watchCondition) {
            await tx.watchCondition.delete({
                where: {
                    watchlistId: watchlist.id,
                },
            });
        }

        await tx.watchlist.delete({
            where: {
                id: watchlist.id,
            },
        });
    });

    return NextResponse.json({
        message: 'watchlist removed',
    });
}