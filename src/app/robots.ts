import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/api/session/'],
                disallow: ['/api/', '/watchlists', '/notifications'],
            },
            {
                userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'CCBot'],
                disallow: ['/'],
            },
        ],
        sitemap: 'https://paw-price.com/sitemap.xml',
    };
}
