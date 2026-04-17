'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
    notificationId: string;
    productId: string;
};

export default function OpenNotificationButton({
                                                   notificationId,
                                                   productId,
                                               }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleOpen = async () => {
        try {
            setLoading(true);

            await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PATCH',
            });

            router.push(`/products/${productId}`);
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('通知を開けませんでした');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleOpen}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
            {loading ? '開いています...' : '商品詳細を見る'}
        </button>
    );
}