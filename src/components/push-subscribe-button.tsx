'use client';

import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

type Env = 'ios-chrome' | 'ios-safari-standalone' | 'ios-safari' | 'supported' | 'unsupported';

function detectEnv(): Env {
    const ua = navigator.userAgent;
    const isIOS = /iP(hone|ad|od)/.test(ua);
    if (!isIOS) return 'PushManager' in window ? 'supported' : 'unsupported';
    if (/CriOS|FxiOS|EdgiOS/.test(ua)) return 'ios-chrome';
    const isStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return isStandalone ? 'ios-safari-standalone' : 'ios-safari';
}

// ---- ガイダンス用SVGアイコン ----

function IconSafari() {
    return (
        <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none">
            <circle cx="20" cy="20" r="19" fill="#1C8DFF" stroke="#0070E0" strokeWidth="1" />
            <circle cx="20" cy="20" r="14" fill="none" stroke="white" strokeWidth="1.5" />
            <line x1="20" y1="6" x2="20" y2="34" stroke="white" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="6" y1="20" x2="34" y2="20" stroke="white" strokeWidth="1" strokeDasharray="2 3" />
            <polygon points="20,9 23,20 20,18 17,20" fill="#FF3B30" />
            <polygon points="20,31 17,20 20,22 23,20" fill="white" />
        </svg>
    );
}

function IconShare() {
    return (
        <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none">
            <rect x="1" y="1" width="38" height="38" rx="8" fill="#F2F2F7" stroke="#C7C7CC" strokeWidth="1" />
            <rect x="13" y="20" width="14" height="12" rx="2" fill="none" stroke="#1C8DFF" strokeWidth="2" />
            <line x1="20" y1="8" x2="20" y2="24" stroke="#1C8DFF" strokeWidth="2" strokeLinecap="round" />
            <polyline points="15,13 20,8 25,13" stroke="#1C8DFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    );
}

function IconAddHome() {
    return (
        <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none">
            <rect x="1" y="1" width="38" height="38" rx="8" fill="#F2F2F7" stroke="#C7C7CC" strokeWidth="1" />
            <path d="M20 10 L28 18 L25 18 L25 28 L15 28 L15 18 L12 18 Z" fill="none" stroke="#1C8DFF" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="28" cy="28" r="6" fill="#34C759" />
            <line x1="28" y1="24" x2="28" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="24" y1="28" x2="32" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function IconHomeScreen() {
    return (
        <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none">
            <rect x="6" y="2" width="28" height="36" rx="5" fill="#1C1C1E" />
            <rect x="8" y="7" width="24" height="28" rx="2" fill="#F2F2F7" />
            <rect x="11" y="10" width="9" height="9" rx="2" fill="#d98f5c" />
            <text x="15.5" y="18" fontSize="7" fill="white" fontWeight="bold" textAnchor="middle">P</text>
            <circle cx="20" cy="39" r="2" fill="#3A3A3C" />
        </svg>
    );
}

function IconBell() {
    return (
        <svg viewBox="0 0 40 40" className="h-10 w-10" fill="none">
            <rect x="1" y="1" width="38" height="38" rx="8" fill="#d98f5c" />
            <path d="M20 10 C15 10 12 14 12 18 L12 24 L10 26 L30 26 L28 24 L28 18 C28 14 25 10 20 10Z" fill="white" />
            <path d="M17 26 Q17 29 20 29 Q23 29 23 26" fill="white" />
            <circle cx="26" cy="14" r="5" fill="#FF3B30" />
        </svg>
    );
}

// ステップカード
function StepCard({ step, icon, text }: { step: number; icon: React.ReactNode; text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
                {icon}
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#4b3425] text-[10px] font-bold text-white">
                    {step}
                </span>
            </div>
            <p className="text-sm text-[#4b3425]">{text}</p>
        </div>
    );
}

// ---- メインコンポーネント ----

export default function PushSubscribeButton() {
    const [status, setStatus] = useState<'checking' | 'idle' | 'loading' | 'done' | 'unsubscribing'>('checking');
    const [guide, setGuide] = useState<'ios-chrome' | 'ios-safari' | 'unsupported' | null>(null);

    // 既存のSubscriptionを確認して状態を復元
    useEffect(() => {
        const check = async () => {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                setStatus('idle');
                return;
            }
            try {
                const reg = await navigator.serviceWorker.register('/sw.js');
                const sub = await reg.pushManager.getSubscription();
                setStatus(sub ? 'done' : 'idle');
            } catch {
                setStatus('idle');
            }
        };
        check();
    }, []);

    const handleSubscribe = async () => {
        const env = detectEnv();
        if (env === 'ios-chrome') { setGuide('ios-chrome'); return; }
        if (env === 'ios-safari') { setGuide('ios-safari'); return; }
        if (env === 'unsupported') { setGuide('unsupported'); return; }

        try {
            setStatus('loading');
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert('通知が許可されていません。ブラウザの設定から許可してください。');
                setStatus('idle');
                return;
            }

            await navigator.serviceWorker.register('/sw.js');
            const ready = await navigator.serviceWorker.ready;
            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!publicKey) throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');

            const existing = await ready.pushManager.getSubscription();
            if (existing) await existing.unsubscribe();
            const subscription = await ready.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
            });

            const res = await fetch('/api/push-subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription),
            });
            if (!res.ok) throw new Error(`購読保存に失敗しました: ${res.status}`);

            setStatus('done');
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : '通知設定に失敗しました');
            setStatus('idle');
        }
    };

    const handleUnsubscribe = async () => {
        try {
            setStatus('unsubscribing');
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await fetch('/api/push-subscriptions/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                });
                await sub.unsubscribe();
            }
            setStatus('idle');
        } catch (error) {
            console.error(error);
            setStatus('done');
        }
    };

    if (status === 'checking') return null;

    return (
        <div>
            {status === 'done' ? (
                <button
                    type="button"
                    onClick={handleUnsubscribe}
                    className="rounded-xl bg-[#e5f3e8] px-4 py-2 text-sm font-medium text-[#3f7a50] transition hover:bg-[#d0ebda]"
                >
                    通知ON ✓
                </button>
            ) : status === 'unsubscribing' ? (
                <span className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400">解除中...</span>
            ) : (
                <button
                    type="button"
                    onClick={handleSubscribe}
                    disabled={status === 'loading'}
                    className="rounded-xl bg-[#d98f5c] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#c97d49] disabled:opacity-50"
                >
                    {status === 'loading' ? '設定中...' : '通知を有効化'}
                </button>
            )}

            {/* iOS Chrome ガイダンス */}
            {guide === 'ios-chrome' && (
                <div className="mt-3 w-80 rounded-2xl border border-[#eadfce] bg-[#fffaf3] p-4 shadow-sm">
                    <p className="mb-4 font-semibold text-[#4b3425]">iOSのChromeでは通知を設定できません</p>
                    <div className="space-y-4">
                        <StepCard step={1} icon={<IconSafari />} text="Safari でこのページを開く" />
                        <StepCard step={2} icon={<IconShare />} text='画面下の「共有」ボタンをタップ' />
                        <StepCard step={3} icon={<IconAddHome />} text='「ホーム画面に追加」を選択' />
                        <StepCard step={4} icon={<IconHomeScreen />} text="ホーム画面のアイコンからアプリを起動" />
                        <StepCard step={5} icon={<IconBell />} text='「通知を有効化」をタップ' />
                    </div>
                    <button onClick={() => setGuide(null)} className="mt-4 text-xs text-[#9a6b3d] underline">閉じる</button>
                </div>
            )}

            {/* iOS Safari（非PWA）ガイダンス */}
            {guide === 'ios-safari' && (
                <div className="mt-3 w-80 rounded-2xl border border-[#eadfce] bg-[#fffaf3] p-4 shadow-sm">
                    <p className="mb-4 font-semibold text-[#4b3425]">ホーム画面への追加が必要です</p>
                    <div className="space-y-4">
                        <StepCard step={1} icon={<IconShare />} text='画面下の「共有」ボタンをタップ' />
                        <StepCard step={2} icon={<IconAddHome />} text='「ホーム画面に追加」を選択' />
                        <StepCard step={3} icon={<IconHomeScreen />} text="ホーム画面のアイコンからアプリを起動" />
                        <StepCard step={4} icon={<IconBell />} text='「通知を有効化」をタップ' />
                    </div>
                    <button onClick={() => setGuide(null)} className="mt-4 text-xs text-[#9a6b3d] underline">閉じる</button>
                </div>
            )}

            {/* 非対応ブラウザ */}
            {guide === 'unsupported' && (
                <div className="mt-3 w-72 rounded-2xl border border-[#eadfce] bg-[#fffaf3] p-4 text-sm text-[#7a6657]">
                    <p>このブラウザはWeb通知に対応していません。</p>
                    <p className="mt-1">ChromeまたはEdgeをご利用ください。</p>
                    <button onClick={() => setGuide(null)} className="mt-3 text-xs text-[#9a6b3d] underline">閉じる</button>
                </div>
            )}
        </div>
    );
}
