import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

const BASE_URL = 'https://paw-price.com';
const URLS_PER_SITEMAP = 5000;

export async function GET() {
    const count = await prisma.product.count({ where: { isActive: true } });
    const total = Math.max(1, Math.ceil(count / URLS_PER_SITEMAP));

    const entries = Array.from({ length: total }, (_, i) =>
        `  <sitemap>\n    <loc>${BASE_URL}/sitemap/${i}.xml</loc>\n  </sitemap>`,
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`;

    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
    });
}
