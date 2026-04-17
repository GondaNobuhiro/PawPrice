import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

const DEMO_USER_ID = BigInt(1);

export async function GET() {
    const notifications = await prisma.notification.findMany({
        where: {
            userId: DEMO_USER_ID,
        },
        include: {
            product: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 5,
    });

    return NextResponse.json(
        notifications.map((notification) => ({
            id: notification.id.toString(),
            subject: notification.subject,
            body: notification.body,
            isRead: notification.isRead,
            createdAt: notification.createdAt,
            product: {
                id: notification.product.id.toString(),
                name: notification.product.name,
            },
        })),
    );
}