import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';
import { getSessionUserId } from '@/src/app/lib/session';

export async function GET() {
    const userId = await getSessionUserId();
    const count = await prisma.notification.count({
        where: { userId, isRead: false },
    });

    return NextResponse.json({ unreadCount: count });
}