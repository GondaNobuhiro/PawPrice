import { prisma } from '@/src/app/lib/prisma';

const BASE_URL = 'https://paw-price.vercel.app';

export default async function sitemap() {
    const products = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, updatedAt: true, petType: true },
        orderBy: { id: 'asc' },
    });

    const productUrls = products.map((p) => ({
        url: `${BASE_URL}/products/${p.id}`,
        lastModified: p.updatedAt,
        changeFrequency: 'daily' as const,
        priority: 0.8,
    }));

    const staticUrls = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'hourly' as const,
            priority: 1.0,
        },
    ];

    return [...staticUrls, ...productUrls];
}