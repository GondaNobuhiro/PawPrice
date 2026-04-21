import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';
import { getSessionUserId } from '@/src/app/lib/session';

export async function PATCH() {
    const userId = await getSessionUserId();
    const result = await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });

    return NextResponse.json({
        message: 'all notifications marked as read',
        updatedCount: result.count,
    });
}