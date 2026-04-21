import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/src/app/lib/prisma';
import { getSessionUserId } from '@/src/app/lib/session';

type Props = {
    params: Promise<{ productId: string }>;
};

export async function DELETE(_: Request, { params }: Props) {
    const [{ productId }, userId] = await Promise.all([params, getSessionUserId()]);

    const watchlist = await prisma.watchlist.findUnique({
        where: { userId_productId: { userId, productId: BigInt(productId) } },
        include: { watchCondition: true },
    });

    if (!watchlist) {
        return NextResponse.json({ message: 'watchlist not found' });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (watchlist.watchCondition) {
            await tx.watchCondition.delete({ where: { watchlistId: watchlist.id } });
        }
        await tx.watchlist.delete({ where: { id: watchlist.id } });
    });

    return NextResponse.json({ message: 'watchlist removed' });
}