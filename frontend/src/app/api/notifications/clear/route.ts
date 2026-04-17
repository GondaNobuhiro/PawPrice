import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

const DEMO_USER_ID = BigInt(1);

export async function DELETE() {
    const result = await prisma.notification.deleteMany({
        where: {
            userId: DEMO_USER_ID,
        },
    });

    return NextResponse.json({
        message: 'notifications deleted',
        deletedCount: result.count,
    });
}