import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

const DEMO_USER_ID = BigInt(1);

export async function GET() {
    const count = await prisma.notification.count({
        where: {
            userId: DEMO_USER_ID,
            isRead: false,
        },
    });

    return NextResponse.json({
        unreadCount: count,
    });
}