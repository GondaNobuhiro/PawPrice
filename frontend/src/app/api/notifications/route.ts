import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';
import { getSessionUserId } from '@/src/app/lib/session';

export async function GET() {
    const userId = await getSessionUserId();
    const notifications = await prisma.notification.findMany({
        where: { userId },
        include: { product: true, productOffer: true },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
        notifications.map((n: (typeof notifications)[number]) => ({
            id: n.id.toString(),
            notificationType: n.notificationType,
            subject: n.subject,
            body: n.body,
            status: n.status,
            isRead: n.isRead,
            sentAt: n.sentAt,
            createdAt: n.createdAt,
            product: { id: n.product.id.toString(), name: n.product.name },
            productOffer: n.productOffer
                ? {
                    id: n.productOffer.id.toString(),
                    shopType: n.productOffer.shopType,
                    effectivePrice: n.productOffer.effectivePrice,
                    externalUrl: n.productOffer.externalUrl,
                }
                : null,
        })),
    );
}