'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import Link from 'next/link';

const GA_ID = 'G-09ZJYSBLQC';
const CONSENT_KEY = 'cookie_consent';

export default function GoogleAnalytics() {
    const [consent, setConsent] = useState<'accepted' | 'declined' | 'pending' | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem(CONSENT_KEY);
        if (stored === 'accepted') setConsent('accepted');
        else if (stored === 'declined') setConsent('declined');
        else setConsent('pending');
    }, []);

    function accept() {
        localStorage.setItem(CONSENT_KEY, 'accepted');
        setConsent('accepted');
    }

    function decline() {
        localStorage.setItem(CONSENT_KEY, 'declined');
        setConsent('declined');
    }

    return (
        <>
            {consent === 'accepted' && (
                <>
                    <Script
                        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                        strategy="afterInteractive"
                    />
                    <Script id="ga-init" strategy="afterInteractive">{`
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${GA_ID}');
                    `}</Script>
                </>
            )}

            {consent === 'pending' && (
                <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#eadfce] bg-white px-4 py-4 shadow-lg">
                    <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs leading-relaxed text-[#78716C]">
                            当サービスはアクセス解析のためCookieを使用しています。
                            詳しくは
                            <Link href="/privacy" className="underline underline-offset-2 hover:text-[#EA580C]">
                                プライバシーポリシー
                            </Link>
                            をご確認ください。
                        </p>
                        <div className="flex shrink-0 gap-2">
                            <button
                                onClick={decline}
                                className="rounded-xl border border-[#eadfce] bg-white px-4 py-2 text-xs text-[#78716C] transition hover:bg-[#f5f0ea]"
                            >
                                拒否する
                            </button>
                            <button
                                onClick={accept}
                                className="rounded-xl bg-[#EA580C] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#C2410C]"
                            >
                                同意する
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
