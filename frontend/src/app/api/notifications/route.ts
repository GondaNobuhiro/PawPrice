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
            productOffer: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return NextResponse.json(
        notifications.map((notification) => ({
            id: notification.id.toString(),
            notificationType: notification.notificationType,
            subject: notification.subject,
            body: notification.body,
            status: notification.status,
            sentAt: notification.sentAt,
            createdAt: notification.createdAt,
            product: {
                id: notification.product.id.toString(),
                name: notification.product.name,
            },
            productOffer: notification.productOffer
                ? {
                    id: notification.productOffer.id.toString(),
                    shopType: notification.productOffer.shopType,
                    effectivePrice: notification.productOffer.effectivePrice,
                    externalUrl: notification.productOffer.externalUrl,
                }
                : null,
        })),
    );
}