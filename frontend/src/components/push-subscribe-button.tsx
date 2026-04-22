'use client';

import { useState } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

function detectEnv(): 'ios-chrome' | 'ios-safari-standalone' | 'ios-safari' | 'supported' | 'unsupported' {
    const ua = navigator.userAgent;
    const isIOS = /iP(hone|ad|od)/.test(ua);
    if (!isIOS) {
        return 'PushManager' in window ? 'supported' : 'unsupported';
    }
    // iOS Chrome/Firefox など（WebKitを使うが chrome/ や fxios が入る）
    const isIOSChrome = /CriOS/.test(ua) || /FxiOS/.test(ua) || /EdgiOS/.test(ua);
    if (isIOSChrome) return 'ios-chrome';
    // iOS Safari — standalone = ホーム画面から起動
    const isStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return isStandalone ? 'ios-safari-standalone' : 'ios-safari';
}

export default function PushSubscribeButton() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [guide, setGuide] = useState<string | null>(null);

    const handleSubscribe = async () => {
        const env = detectEnv();

        if (env === 'ios-chrome') {
            setGuide('ios-chrome');
            return;
        }
        if (env === 'ios-safari') {
            setGuide('ios-safari');
            return;
        }
        if (env === 'unsupported') {
            setGuide('unsupported');
            return;
        }

        try {
            setStatus('loading');

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert('通知が許可されていません。ブラウザの設定から許可してください。');
                return;
            }

            await navigator.serviceWorker.register('/sw.js');
            const ready = await navigator.serviceWorker.ready;

            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!publicKey) throw new Error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set');

            const existing = await ready.pushManager.getSubscription();
            const subscription =
                existing ??
                (await ready.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
                }));

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
        } finally {
            if (status === 'loading') setStatus('idle');
        }
    };

    return (
        <div>
            {status === 'done' ? (
                <span className="rounded-xl bg-[#e5f3e8] px-4 py-2 text-sm font-medium text-[#3f7a50]">
                    通知ON ✓
                </span>
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
                <div className="mt-3 max-w-sm rounded-2xl border border-[#eadfce] bg-[#fffaf3] p-4 text-sm text-[#4b3425]">
                    <p className="mb-2 font-medium">iOSのChromeでは通知を設定できません</p>
                    <ol className="list-decimal space-y-1 pl-4 text-[#7a6657]">
                        <li><strong>Safari</strong> でこのページを開く</li>
                        <li>下部の「共有」ボタン → 「ホーム画面に追加」</li>
                        <li>ホーム画面のアイコンからアプリを開く</li>
                        <li>「通知を有効化」をタップ</li>
                    </ol>
                    <button onClick={() => setGuide(null)} className="mt-3 text-xs text-[#9a6b3d] underline">閉じる</button>
                </div>
            )}

            {/* iOS Safari（非PWA）ガイダンス */}
            {guide === 'ios-safari' && (
                <div className="mt-3 max-w-sm rounded-2xl border border-[#eadfce] bg-[#fffaf3] p-4 text-sm text-[#4b3425]">
                    <p className="mb-2 font-medium">ホーム画面への追加が必要です</p>
                    <ol className="list-decimal space-y-1 pl-4 text-[#7a6657]">
                        <li>下部の「共有」ボタン（四角＋矢印）をタップ</li>
                        <li>「ホーム画面に追加」を選択</li>
                        <li>ホーム画面のアイコンからアプリを開く</li>
                        <li>「通知を有効化」をタップ</li>
                    </ol>
                    <button onClick={() => setGuide(null)} className="mt-3 text-xs text-[#9a6b3d] underline">閉じる</button>
                </div>
            )}

            {/* 非対応ブラウザ */}
            {guide === 'unsupported' && (
                <div className="mt-3 max-w-sm rounded-2xl border border-[#eadfce] bg-[#fffaf3] p-4 text-sm text-[#7a6657]">
                    <p>このブラウザはWeb通知に対応していません。</p>
                    <p className="mt-1">ChromeまたはEdgeをご利用ください。</p>
                    <button onClick={() => setGuide(null)} className="mt-3 text-xs text-[#9a6b3d] underline">閉じる</button>
                </div>
            )}
        </div>
    );
}
