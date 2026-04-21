import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';
import { getSessionUserId } from '@/src/app/lib/session';

export async function DELETE() {
    const userId = await getSessionUserId();
    const result = await prisma.notification.deleteMany({
        where: { userId },
    });

    return NextResponse.json({
        message: 'notifications deleted',
        deletedCount: result.count,
    });
}