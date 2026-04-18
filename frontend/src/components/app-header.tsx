import Link from 'next/link';
import NotificationBell from '@/src/components/notification-bell';

export default function AppHeader() {
    return (
        <header className="sticky top-0 z-40 border-b border-[#eadfce] bg-[#fffaf3]/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src="/logo.png"
                            alt="PawPrice"
                            className="h-9 w-9 rounded-xl"
                        />
                        <span className="text-2xl font-bold text-[#4b3425]">PawPrice</span>
                    </Link>

                    <nav className="hidden items-center gap-2 md:flex">
                        <Link
                            href="/"
                            className="rounded-full px-4 py-2 text-sm text-[#7a6657] transition hover:bg-[#f5e8d8] hover:text-[#4b3425]"
                        >
                            商品一覧
                        </Link>
                        <Link
                            href="/watchlists"
                            className="rounded-full px-4 py-2 text-sm text-[#7a6657] transition hover:bg-[#f5e8d8] hover:text-[#4b3425]"
                        >
                            ウォッチリスト
                        </Link>
                        <Link
                            href="/notifications"
                            className="rounded-full px-4 py-2 text-sm text-[#7a6657] transition hover:bg-[#f5e8d8] hover:text-[#4b3425]"
                        >
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