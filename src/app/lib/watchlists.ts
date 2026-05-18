import { prisma } from './prisma';
import { getSessionUserId } from './session';

export type WatchlistItem = {
    id: string;
    createdAt: string;
    product: {
        id: string;
        name: string;
        category: string;
        brand: string | null;
        petType: string;
        packageSize: string | null;
        imageUrl: string | null;
        lowestOffer: {
            shopType: string;
            price: number;
            effectivePrice: number;
            externalUrl: string;
        } | null;
    };
};

export async function getWatchlists(): Promise<WatchlistItem[]> {
    const userId = await getSessionUserId();
    const watchlists = await prisma.watchlist.findMany({
        where: { userId },
        include: {
            product: {
                include: {
                    category: true,
                    brand: true,
                    offers: {
                        where: { isActive: true },
                        orderBy: { effectivePrice: 'asc' },
                        take: 1,
                    },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return watchlists.map((watch) => ({
        id: watch.id.toString(),
        createdAt: watch.createdAt.toISOString(),
        product: {
            id: watch.product.id.toString(),
            name: watch.product.name,
            category: watch.product.category.name,
            brand: watch.product.brand?.name ?? null,
            petType: watch.product.petType,
            packageSize: watch.product.packageSize,
            imageUrl: watch.product.imageUrl,
            lowestOffer: watch.product.offers[0]
                ? {
                    shopType: watch.product.offers[0].shopType,
                    price: watch.product.offers[0].price,
                    effectivePrice: watch.product.offers[0].effectivePrice,
                    externalUrl: watch.product.offers[0].externalUrl,
                }
                : null,
        },
    }));
}