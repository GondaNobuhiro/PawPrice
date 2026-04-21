import type { Metadata } from 'next';
import './globals.css';
import AppHeader from '@/src/components/app-header';

export const metadata: Metadata = {
    title: {
        default: 'PawPrice — ペット用品の価格比較',
        template: '%s | PawPrice',
    },
    description: '犬・猫用品の最安値をショップ横断で比較。価格推移・ポイント還元込みの実質価格を確認できます。',
    metadataBase: new URL('https://pawprice.vercel.app'),
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
    },
};

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="ja">
      <body className="bg-gray-50 text-gray-900">
      <AppHeader />
      {children}
      </body>
      </html>
  );
}