import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Amplify WEB_COMPUTE の Lambda は Amplify 環境変数を受け取らないため
    // ビルド時に値を埋め込む（サーバーサイドのみ、クライアントには非公開）
    env: {
        DATABASE_URL:      process.env.DATABASE_URL      ?? '',
        VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY ?? '',
        VAPID_SUBJECT:     process.env.VAPID_SUBJECT     ?? '',
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'thumbnail.image.rakuten.co.jp',
            },
            {
                protocol: 'https',
                hostname: 'item-shopping.c.yimg.jp',
            },
        ],
    },
    async headers() {
        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https://thumbnail.image.rakuten.co.jp https://item-shopping.c.yimg.jp https://www.google-analytics.com",
            "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com",
            "object-src 'none'",
            "base-uri 'self'",
            "frame-ancestors 'none'",
        ].join('; ');

        const securityHeaders = [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
            { key: 'Content-Security-Policy', value: csp },
        ];

        const manifestHeader = {
            source: '/manifest.json',
            headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
        };

        if (process.env.NODE_ENV !== 'production') {
            return [
                manifestHeader,
                {
                    source: '/(.*)',
                    headers: [
                        { key: 'X-Robots-Tag', value: 'noindex' },
                        ...securityHeaders,
                    ],
                },
            ];
        }
        return [
            manifestHeader,
            {
                source: '/(.*)',
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;