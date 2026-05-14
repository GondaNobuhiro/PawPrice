import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'CCBot'],
                disallow: ['/'],
            },
            {
                userAgent: '*',
                allow: ['/', '/products/'],
                disallow: ['/api/', '/watchlists', '/notifications'],
            },
        ],
        sitemap: 'https://paw-price.vercel.app/sitemap.xml',
    };
}
