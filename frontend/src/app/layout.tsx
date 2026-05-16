import type { Metadata } from 'next';
import Script from 'next/script';
import { Noto_Sans_JP, DM_Serif_Display } from 'next/font/google';
import './globals.css';
import AppHeader from '@/src/components/app-header';

const notoSansJP = Noto_Sans_JP({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

const dmSerifDisplay = DM_Serif_Display({
    subsets: ['latin'],
    weight: '400',
    display: 'swap',
    variable: '--font-display',
});

const GA_ID = 'G-09ZJYSBLQC';

const BASE_URL = 'https://paw-price.vercel.app';

const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PawPrice',
    url: BASE_URL,
};

const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PawPrice',
    url: BASE_URL,
    logo: `${BASE_URL}/icon.png`,
    description: '犬・猫用品の最安値をショップ横断で比較。ポイント還元込みの実質価格と価格推移を確認できるペット用品価格比較サービス。',
};

export const metadata: Metadata = {
    title: {
        default: 'PawPrice — ペット用品の価格比較',
        template: '%s | PawPrice',
    },
    description: '犬・猫用品の最安値をショップ横断で比較。価格推移・ポイント還元込みの実質価格を確認できます。',
    metadataBase: new URL(BASE_URL),
    keywords: ['ペット用品', '価格比較', '最安値', '犬', '猫', 'ドッグフード', 'キャットフード', 'ポイント還元'],
    openGraph: {
        type: 'website',
        siteName: 'PawPrice',
        title: 'PawPrice — ペット用品の価格比較',
        description: '犬・猫用品の最安値をショップ横断で比較。価格推移・ポイント還元込みの実質価格を確認できます。',
        locale: 'ja_JP',
    },
    twitter: {
        card: 'summary',
        title: 'PawPrice — ペット用品の価格比較',
        description: '犬・猫用品の最安値をショップ横断で比較。',
    },
    icons: {
        icon: [
            { url: '/favicon.ico' },
            { url: '/icon.png', type: 'image/png' },
        ],
        apple: '/icon.png',
    },
    manifest: '/manifest.json',
    other: {
        'theme-color': '#EA580C',
    },
};

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="ja">
      <body className={`${notoSansJP.className} ${dmSerifDisplay.variable} bg-[#FAF8F4] text-[#1C1917]`}>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_ID}');
      `}</Script>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <AppHeader />
      {children}
      </body>
      </html>
  );
}
