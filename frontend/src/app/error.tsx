'use client';

import { useEffect } from 'react';

type Props = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="min-h-screen bg-[#f8f4ee] px-6 py-8">
            <div className="mx-auto max-w-xl py-20 text-center">
                <div className="mb-4 text-4xl">🐾</div>
                <h2 className="mb-2 text-xl font-semibold text-[#4b3425]">
                    エラーが発生しました
                </h2>
                <p className="mb-6 text-sm text-[#7a6657]">
                    しばらく時間をおいてから再度お試しください。
                </p>
                <button
                    onClick={reset}
                    className="rounded-2xl bg-[#d98f5c] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#c97d49]"
                >
                    再試行
                </button>
            </div>
        </main>
    );
}