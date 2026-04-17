import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

const DEMO_USER_ID = BigInt(1);

type Props = {
    params: Promise<{
        productId: string;
    }>;
};

export async function GET(_: Request, { params }: Props) {
    const { productId } = await params;

    const watch = await prisma.watchlist.findUnique({
        where: {
            userId_productId: {
                userId: DEMO_USER_ID,
                productId: BigInt(productId),
            },
        },
    });

    return NextResponse.json({
        watched: !!watch,
    });
}