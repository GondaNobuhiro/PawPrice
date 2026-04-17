'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
    productId: string;
};

export default function UnwatchButton({ productId }: Props) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRemove = async () => {
        try {
            setLoading(true);

            const res = await fetch(`/api/watchlists/${productId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('ウォッチ解除に失敗しました');
            }

            router.refresh();
        } catch (error) {
            console.error(error);
            alert('ウォッチ解除に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleRemove}
            disabled={loading}
            className="mt-3 rounded-lg bg-gray-600 px-4 py-2 text-white disabled:opacity-50"
        >
            {loading ? '解除中...' : 'ウォッチ解除'}
        </button>
    );
}