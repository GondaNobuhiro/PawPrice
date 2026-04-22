import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/products/'],
                disallow: ['/api/', '/watchlists', '/notifications'],
            },
        ],
        sitemap: 'https://paw-price.vercel.app/sitemap.xml',
    };
}
