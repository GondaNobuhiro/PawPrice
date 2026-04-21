'use client';

import { useState } from 'react';
import PriceHistoryChart from './price-history-chart';

type PriceHistory = {
    id: string;
    price: number;
    effectivePrice: number;
    fetchedAt: string;
};

type Props = {
    offer: {
        id: string;
        shopType: string;
        title: string | null;
        price: number;
        shippingFee: number | null;
        pointAmount: number;
        effectivePrice: number;
        externalUrl: string;
        sellerName: string | null;
        availabilityStatus: string | null;
        priceHistories: PriceHistory[];
    };
    isLowest: boolean;
};

function formatCurrency(value: number): string {
    return `¥${value.toLocaleString()}`;
}

function formatShipping(fee: number | null): string {
    if (fee === null) return '送料別';
    if (fee === 0) return '送料無料';
    return `送料 ${formatCurrency(fee)}`;
}

export default function OfferCard({ offer, isLowest }: Props) {
    const [showChart, setShowChart] = useState(false);
    const hasHistory = offer.priceHistories.length >= 1;

    return (
        <div className={`rounded-2xl border p-4 ${isLowest ? 'border-blue-200 bg-blue-50' : 'bg-white'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-gray-900">{offer.shopType}</div>
                        {isLowest && (
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                                最安
                            </span>
                        )}
                    </div>
                    <div className="text-sm text-gray-600">{offer.sellerName ?? '-'}</div>
                </div>

                <div className="text-right">
                    <div className="text-xs text-gray-400">実質価格</div>
                    <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(offer.effectivePrice)}
                    </div>
                    <div className="mt-1 flex flex-wrap justify-end gap-2 text-xs text-gray-500">
                        <span>価格 {formatCurrency(offer.price)}</span>
                        {offer.pointAmount > 0 && (
                            <span className="text-orange-600">
                                − ポイント還元 {formatCurrency(offer.pointAmount)}
                            </span>
                        )}
                        <span>{formatShipping(offer.shippingFee)}</span>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
                <a
                    href={offer.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm text-gray-700"
                >
                    商品ページを見る
                </a>
                {hasHistory && (
                    <button
                        onClick={() => setShowChart((v) => !v)}
                        className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100"
                    >
                        {showChart ? '価格推移を閉じる ▲' : '価格推移を見る ▼'}
                    </button>
                )}
            </div>

            {showChart && (
                <div className="mt-4">
                    <PriceHistoryChart priceHistories={offer.priceHistories} />
                </div>
            )}
        </div>
    );
}