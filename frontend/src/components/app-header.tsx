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
        <header className="sticky top-0 z-40 border-b border-[#eadfce] bg-[#fffaf3]/95 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
                        <img src="/logo.png" alt="PawPrice" className="h-25 w-25 rounded-xl" />
                    </Link>

                    {/* PC nav */}
                    <nav className="hidden items-center gap-2 md:flex">
                        {NAV_LINKS.map(({ href, label }) => (
                            <Link
                                key={href}
                                href={href}
                                className={`rounded-full px-4 py-2 text-sm transition ${
                                    pathname === href
                                        ? 'bg-[#f5e8d8] font-medium text-[#4b3425]'
                                        : 'text-[#7a6657] hover:bg-[#f5e8d8] hover:text-[#4b3425]'
                                }`}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <NotificationBell />

                    {/* ハンバーガーボタン（モバイルのみ） */}
                    <button
                        className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 rounded-xl border border-[#eadfce] bg-white md:hidden"
                        onClick={() => setOpen((v) => !v)}
                        aria-label="メニュー"
                    >
                        <span className={`block h-0.5 w-5 bg-[#7a6657] transition-transform ${open ? 'translate-y-2 rotate-45' : ''}`} />
                        <span className={`block h-0.5 w-5 bg-[#7a6657] transition-opacity ${open ? 'opacity-0' : ''}`} />
                        <span className={`block h-0.5 w-5 bg-[#7a6657] transition-transform ${open ? '-translate-y-2 -rotate-45' : ''}`} />
                    </button>
                </div>
            </div>

            {/* モバイルメニュー */}
            {open && (
                <nav className="border-t border-[#eadfce] bg-[#fffaf3] px-6 py-3 md:hidden">
                    {NAV_LINKS.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            className={`block rounded-xl px-4 py-3 text-sm transition ${
                                pathname === href
                                    ? 'bg-[#f5e8d8] font-medium text-[#4b3425]'
                                    : 'text-[#7a6657] hover:bg-[#f5e8d8]'
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