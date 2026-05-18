'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NotificationBell from '@/src/components/notification-bell';

const NAV_LINKS = [
    { href: '/', label: '商品一覧' },
    { href: '/watchlists', label: 'ウォッチリスト' },
    { href: '/notifications', label: '通知一覧' },
];

export default function AppHeader() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-40 border-b border-sky-200 bg-[#e0f2fe] shadow-sm">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-16">
                <div className="flex items-center gap-8">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
                        onClick={() => setOpen(false)}
                    >
                        <img src="/logo.png" alt="PawPrice" className="h-20 w-20 rounded-lg" />
                    </Link>

                    {/* PC nav */}
                    <nav className="hidden items-center gap-1 md:flex">
                        {NAV_LINKS.map(({ href, label }) => {
                            const isActive = pathname === href;
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    prefetch={false}
                                    className={`nav-link px-3 py-2 text-sm transition-colors ${
                                        isActive
                                            ? 'active text-[#0c4a6e] font-medium'
                                            : 'text-[#0369a1] hover:text-[#0c4a6e]'
                                    }`}
                                >
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <NotificationBell />

                    {/* ハンバーガーボタン（モバイルのみ） */}
                    <button
                        className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-lg transition-colors hover:bg-sky-200 md:hidden"
                        onClick={() => setOpen((v) => !v)}
                        aria-label="メニュー"
                    >
                        <span className={`block h-0.5 w-5 bg-[#0c4a6e] transition-all duration-200 ${open ? 'translate-y-2 rotate-45' : ''}`} />
                        <span className={`block h-0.5 w-5 bg-[#0c4a6e] transition-opacity duration-200 ${open ? 'opacity-0' : ''}`} />
                        <span className={`block h-0.5 w-5 bg-[#0c4a6e] transition-all duration-200 ${open ? '-translate-y-2 -rotate-45' : ''}`} />
                    </button>
                </div>
            </div>

            {/* モバイルメニュー */}
            {open && (
                <nav className="animate-slide-down border-t border-sky-200 bg-[#bae6fd] px-6 pb-3 md:hidden">
                    {NAV_LINKS.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            prefetch={false}
                            onClick={() => setOpen(false)}
                            className={`flex items-center border-b border-sky-300/50 py-3.5 text-sm last:border-0 transition-colors ${
                                pathname === href
                                    ? 'font-medium text-[#0c4a6e]'
                                    : 'text-[#0369a1] hover:text-[#0c4a6e]'
                            }`}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>
            )}
        </header>
    );
}
