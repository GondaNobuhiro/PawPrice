'use client';

import { useState } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

export default function PushSubscribeButton() {
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async () => {
        try {
            setLoading(true);

            if (!('serviceWorker' in navigator)) {
                alert('このブラウザは Service Worker に対応していません');
                return;
            }

            if (!('PushManager' in window)) {
                alert('このブラウザは Webプッシュに対応していません');
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert('通知が許可されていません');
                return;
            }

            await navigator.serviceWorker.register('/sw.js');
            const ready = await navigator.serviceWorker.ready;

            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!publicKey) {
                alert('VAPID 公開鍵が設定されていません');
                return;
            }

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

            if (!res.ok) {
                alert('購読保存に失敗しました');
                return;
            }

            alert('Webプッシュ通知を有効化しました');
        } catch (error) {
            console.error(error);
            alert('Webプッシュ通知の設定に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
            {loading ? '設定中...' : 'Webプッシュ通知を有効化'}
        </button>
    );
}