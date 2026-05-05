import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'thumbnail.image.rakuten.co.jp',
            },
        ],
    },
    async headers() {
        const securityHeaders = [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ];

        if (process.env.VERCEL_ENV !== 'production') {
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