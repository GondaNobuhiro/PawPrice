import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';
import { getSessionUserId } from '@/src/app/lib/session';

type Props = {
    params: Promise<{ productId: string }>;
};

export async function GET(_: Request, { params }: Props) {
    const [{ productId }, userId] = await Promise.all([params, getSessionUserId()]);

    const watch = await prisma.watchlist.findUnique({
        where: { userId_productId: { userId, productId: BigInt(productId) } },
    });

    return NextResponse.json({ watched: !!watch });
}