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
        if (process.env.VERCEL_ENV !== 'production') {
            return [
                {
                    source: '/(.*)',
                    headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
                },
            ];
        }
        return [];
    },
};

export default nextConfig;