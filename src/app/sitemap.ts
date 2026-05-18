import type { MetadataRoute } from 'next';
import { prisma } from '@/src/app/lib/prisma';

const BASE_URL = 'https://paw-price.com';
const URLS_PER_SITEMAP = 5000;

export async function generateSitemaps() {
    const count = await prisma.product.count({ where: { isActive: true } });
    const total = Math.max(1, Math.ceil(count / URLS_PER_SITEMAP));
    return Array.from({ length: total }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
    const products = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, updatedAt: true },
        orderBy: { id: 'asc' },
        skip: id * URLS_PER_SITEMAP,
        take: URLS_PER_SITEMAP,
    });

    const productUrls: MetadataRoute.Sitemap = products.map((p) => ({
        url: `${BASE_URL}/products/${p.id}`,
        lastModified: p.updatedAt,
        changeFrequency: 'daily',
        priority: 0.8,
    }));

    // 最初のサイトマップにトップページを含める
    if (id === 0) {
        return [
            {
                url: BASE_URL,
                lastModified: new Date(),
                changeFrequency: 'hourly',
                priority: 1.0,
            },
            ...productUrls,
        ];
    }

    return productUrls;
}
