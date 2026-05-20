'use client';

import { useEffect, useState } from 'react';

export default function PwaCheckPage() {
    const [info, setInfo] = useState<Record<string, string>>({});

    useEffect(() => {
        const standalone = (navigator as Navigator & { standalone?: boolean }).standalone;
        const displayMode = window.matchMedia('(display-mode: standalone)').matches
            ? 'standalone'
            : window.matchMedia('(display-mode: minimal-ui)').matches
              ? 'minimal-ui'
              : window.matchMedia('(display-mode: fullscreen)').matches
                ? 'fullscreen'
                : 'browser';

        const headTags: string[] = [];
        document.querySelectorAll('meta[name="apple-mobile-web-app-capable"]').forEach((el) => {
            headTags.push(`apple-mobile-web-app-capable=${el.getAttribute('content')}`);
        });
        document.querySelectorAll('meta[name="mobile-web-app-capable"]').forEach((el) => {
            headTags.push(`mobile-web-app-capable=${el.getAttribute('content')}`);
        });

        setInfo({
            'navigator.standalone': String(standalone),
            'display-mode (matchMedia)': displayMode,
            'iOS?': /iP(hone|ad|od)/.test(navigator.userAgent) ? 'Yes' : 'No',
            'User Agent': navigator.userAgent.substring(0, 80),
            'meta tags found': headTags.join(', ') || '（なし）',
            'URL': window.location.href,
        });
    }, []);

    return (
        <main className="min-h-screen bg-[#f8f4ee] p-6">
            <div className="mx-auto max-w-xl">
                <h1 className="mb-6 text-xl font-bold text-gray-900">PWA 診断</h1>
                <div className="rounded-2xl border border-[#eadfce] bg-white p-4 space-y-3">
                    {Object.entries(info).map(([key, value]) => (
                        <div key={key} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                            <div className="text-xs font-medium text-gray-500">{key}</div>
                            <div className="mt-0.5 break-all text-sm font-mono text-gray-900">{value || '...'}</div>
                        </div>
                    ))}
                    {Object.keys(info).length === 0 && (
                        <p className="text-sm text-gray-500">読み込み中...</p>
                    )}
                </div>
                <p className="mt-4 text-xs text-gray-500">
                    スタンドアロンモードで動作している場合、<code>navigator.standalone</code> が <code>true</code>、<code>display-mode</code> が <code>standalone</code> になります。
                </p>
            </div>
        </main>
    );
}
