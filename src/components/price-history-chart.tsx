'use client';

import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

type PriceHistory = {
    id: string;
    price: number;
    effectivePrice: number;
    fetchedAt: string;
};

type Props = {
    priceHistories: PriceHistory[];
};

type ChartRow = {
    label: string;
    effectivePrice: number;
    price: number;
};

function formatLabel(fetchedAt: string): string {
    const date = new Date(fetchedAt);
    return date.toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(value: number): string {
    return `¥${value.toLocaleString()}`;
}

export default function PriceHistoryChart({ priceHistories }: Props) {
    const chartData: ChartRow[] = [...priceHistories]
        .sort((a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime())
        .map((h) => ({
            label: formatLabel(h.fetchedAt),
            effectivePrice: h.effectivePrice,
            price: h.price,
        }));

    if (chartData.length === 0) {
        return <div className="py-4 text-sm text-gray-400">価格履歴データがありません</div>;
    }

    const minPrice = Math.min(...chartData.map((r) => r.effectivePrice));
    const currentPrice = chartData[chartData.length - 1].effectivePrice;

    return (
        <div className="rounded-xl border bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-gray-700">このショップの価格推移</div>
                <div className="flex gap-3 text-xs">
                    <span className="rounded bg-gray-100 px-2 py-1 text-gray-600">
                        現在 {formatCurrency(currentPrice)}
                    </span>
                    <span className="rounded bg-blue-50 px-2 py-1 text-blue-600">
                        最安 {formatCurrency(minPrice)}
                    </span>
                </div>
            </div>

            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" minTickGap={40} tick={{ fontSize: 11 }} />
                        <YAxis
                            width={80}
                            tickFormatter={(v) => formatCurrency(Number(v))}
                            tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                            formatter={(value: unknown) => [formatCurrency(Number(value)), '実質価格']}
                            labelFormatter={(label) => label}
                        />
                        <ReferenceLine y={minPrice} stroke="#2563eb" strokeDasharray="4 4" />
                        <Line
                            type="stepAfter"
                            dataKey="effectivePrice"
                            stroke="#2563eb"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
