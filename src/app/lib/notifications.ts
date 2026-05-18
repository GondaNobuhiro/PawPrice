import { prisma } from './prisma';
import { getSessionUserId } from './session';

export type NotificationItem = {
    id: string;
    notificationType: string;
    subject: string;
    body: string;
    isRead: boolean;
    sentAt: string | null;
    createdAt: string;
    product: {
        id: string;
        name: string;
    };
    productOffer: {
        id: string;
        shopType: string;
        effectivePrice: number;
        externalUrl: string;
    } | null;
};

export async function getNotifications(): Promise<NotificationItem[]> {
    const userId = await getSessionUserId();
    const notifications = await prisma.notification.findMany({
        where: { userId },
        include: {
            product: true,
            productOffer: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return notifications.map((n) => ({
        id: n.id.toString(),
        notificationType: n.notificationType,
        subject: n.subject,
        body: n.body,
        isRead: n.isRead,
        sentAt: n.sentAt ? n.sentAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
        product: {
            id: n.product.id.toString(),
            name: n.product.name,
        },
        productOffer: n.productOffer
            ? {
                id: n.productOffer.id.toString(),
                shopType: n.productOffer.shopType,
                effectivePrice: n.productOffer.effectivePrice,
                externalUrl: n.productOffer.externalUrl,
            }
            : null,
    }));
}
