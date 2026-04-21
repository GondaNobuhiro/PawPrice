import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';
import { getSessionUserId } from '@/src/app/lib/session';

export async function GET() {
    const userId = await getSessionUserId();
    const notifications = await prisma.notification.findMany({
        where: { userId },
        include: { product: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
    });

    return NextResponse.json(
        notifications.map((n) => ({
            id: n.id.toString(),
            subject: n.subject,
            body: n.body,
            isRead: n.isRead,
            createdAt: n.createdAt,
            product: { id: n.product.id.toString(), name: n.product.name },
        })),
    );
}