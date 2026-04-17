import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

const DEMO_USER_ID = BigInt(1);

export async function PATCH() {
    const result = await prisma.notification.updateMany({
        where: {
            userId: DEMO_USER_ID,
            isRead: false,
        },
        data: {
            isRead: true,
        },
    });

    return NextResponse.json({
        message: 'all notifications marked as read',
        updatedCount: result.count,
    });
}