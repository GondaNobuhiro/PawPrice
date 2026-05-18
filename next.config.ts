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
        const securityHeaders = [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ];

        if (process.env.NODE_ENV !== 'production') {
            return [
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
            {
                source: '/(.*)',
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;