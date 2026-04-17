import Link from 'next/link';
import NotificationBell from '@/src/components/notification-bell';

export default function AppHeader() {
    return (
        <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-6">
                    <Link href="/" className="text-2xl font-bold text-gray-900">
                        PawPrice
                    </Link>

                    <nav className="hidden items-center gap-4 text-sm text-gray-600 md:flex">
                        <Link href="/" className="hover:text-gray-900">
                            商品一覧
                        </Link>
                        <Link href="/watchlists" className="hover:text-gray-900">
                            ウォッチリスト
                        </Link>
                        <Link href="/notifications" className="hover:text-gray-900">
                            通知一覧
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <NotificationBell />
                </div>
            </div>
        </header>
    );
}