import type { Metadata } from 'next';
import { Noto_Sans_JP, DM_Serif_Display } from 'next/font/google';
import { headers } from 'next/headers';
import { trace } from '@opentelemetry/api';
import './globals.css';
import AppHeader from '@/src/components/app-header';
import GoogleAnalytics from '@/src/components/google-analytics';

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

const BASE_URL = 'https://paw-price.com';

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
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'PawPrice',
    },
    other: {
        'theme-color': '#EA580C',
        'apple-mobile-web-app-capable': 'yes',
    },
};

export default async function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  // await より前にスパンを取得（await 後は RSC の非同期コンテキスト切替でスパンが null になる）
  const span = trace.getActiveSpan();
  const h = await headers();
  if (span) {
      span.setAttribute('http.user_agent', (h.get('user-agent') ?? '-').substring(0, 150));
      span.setAttribute('net.peer.ip', h.get('x-forwarded-for')?.split(',')[0].trim() ?? '-');
      span.setAttribute('http.method', h.get('x-forwarded-method') ?? 'GET');
  }

  return (
      <html lang="ja">
      <body className={`${notoSansJP.className} ${dmSerifDisplay.variable} bg-[#FAF8F4] text-[#1C1917]`}>
      <GoogleAnalytics />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <AppHeader />
      {children}
      <footer className="mt-16 border-t border-[#E7E5E4] bg-white py-8">
          <div className="mx-auto max-w-5xl px-4">
              <div className="flex flex-col items-center gap-3 text-center">
                  <p className="text-xs font-medium text-[#1C1917]">PawPrice</p>
                  <nav className="flex flex-wrap justify-center gap-4 text-xs text-[#78716C]">
                      <a href="/terms" className="hover:text-[#EA580C] transition-colors">利用規約</a>
                      <a href="/privacy" className="hover:text-[#EA580C] transition-colors">プライバシーポリシー</a>
                  </nav>
                  <p className="text-xs text-[#A8A29E]">
                      当サービスは楽天グループ株式会社およびAmazon.co.jpのアフィリエイトプログラムに参加しています（PR）
                  </p>
                  <p className="text-xs text-[#A8A29E]">© 2026 PawPrice</p>
              </div>
          </div>
      </footer>
      </body>
      </html>
  );
}
