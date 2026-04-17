'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

type PriceHistory = {
    id: string;
    price: number;
    effectivePrice: number;
    fetchedAt: string;
};

type Offer = {
    id: string;
    shopType: string;
    title: string;
    price: number;
    shippingFee: number;
    pointAmount: number;
    effectivePrice: number;
    externalUrl: string;
    sellerName: string | null;
    availabilityStatus: string | null;
    priceHistories: PriceHistory[];
};

type Props = {
    offers: Offer[];
};

type ChartRow = {
    fetchedAt: string;
    label: string;
    [key: string]: string | number;
};

function formatDateLabel(value: string): string {
    return new Date(value).toLocaleString('ja-JP', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function buildChartData(offers: Offer[]): ChartRow[] {
    const map = new Map<string, ChartRow>();

    for (const offer of offers) {
        for (const history of offer.priceHistories) {
            const key = history.fetchedAt;

            if (!map.has(key)) {
                map.set(key, {
                    fetchedAt: history.fetchedAt,
                    label: formatDateLabel(history.fetchedAt),
                });
            }

            map.get(key)![offer.shopType] = history.effectivePrice;
        }
    }

    return Array.from(map.values()).sort(
        (a, b) =>
            new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime(),
    );
}

function buildOfferKeys(offers: Offer[]): string[] {
    return Array.from(new Set(offers.map((offer) => offer.shopType)));
}

export default function PriceHistoryChart({ offers }: Props) {
    const chartData = buildChartData(offers);
    const offerKeys = buildOfferKeys(offers);

    if (chartData.length === 0) {
        return (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
                価格履歴データがありません
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">価格履歴グラフ</h2>

            <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" minTickGap={24} />
                        <YAxis
                            tickFormatter={(value) => `¥${Number(value).toLocaleString()}`}
                            width={90}
                        />
                        <Tooltip
                            formatter={(value) => `¥${Number(value).toLocaleString()}`}
                            labelFormatter={(label) => `取得日時: ${label}`}
                        />
                        <Legend />
                        {offerKeys.map((key) => (
                            <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                connectNulls
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}