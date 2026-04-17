import type { Metadata } from 'next';
import './globals.css';
import AppHeader from '@/src/components/app-header';

export const metadata: Metadata = {
  title: 'PawPrice',
  description: 'ペット用品の価格比較サービス',
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