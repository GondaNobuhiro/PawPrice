import type { Metadata } from 'next';
import './globals.css';
import AppHeader from '@/src/components/app-header';

export const metadata = {
    title: 'PawPrice',
    description: 'ペット用品の価格比較',
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