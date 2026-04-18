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
    effectivePrice: number;
    fetchedAt: string;
};

type Offer = {
    id: string;
    priceHistories: PriceHistory[];
};

type Props = {
    offers: Offer[];
};

type ChartRow = {
    bucketKey: string;
    label: string;
    minPrice: number;
    droppedFromPrevious: boolean;
};

function getHourlyBucketKey(value: string): string {
    const date = new Date(value);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:00:00Z`;
}

function formatBucketLabel(bucketKey: string): string {
    const date = new Date(bucketKey);
    return date.toLocaleString('ja-JP', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
    });
}

function formatCurrency(value: number): string {
    return `¥${value.toLocaleString()}`;
}

function buildChartData(offers: Offer[]): ChartRow[] {
    const allHistories = offers.flatMap((offer) =>
        offer.priceHistories.map((history) => ({
            fetchedAt: history.fetchedAt,
            effectivePrice: history.effectivePrice,
        })),
    );

    if (allHistories.length === 0) {
        return [];
    }

    const grouped = new Map<string, number[]>();

    for (const history of allHistories) {
        const bucketKey = getHourlyBucketKey(history.fetchedAt);

        if (!grouped.has(bucketKey)) {
            grouped.set(bucketKey, [history.effectivePrice]);
            continue;
        }

        grouped.get(bucketKey)!.push(history.effectivePrice);
    }

    const rows = Array.from(grouped.entries())
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([bucketKey, prices]) => ({
            bucketKey,
            label: formatBucketLabel(bucketKey),
            minPrice: Math.min(...prices),
        }));

    return rows.map((row, index) => {
        if (index === 0) {
            return {
                ...row,
                droppedFromPrevious: false,
            };
        }

        const previous = rows[index - 1];

        return {
            ...row,
            droppedFromPrevious: row.minPrice < previous.minPrice,
        };
    });
}

type DotProps = {
    cx?: number;
    cy?: number;
    payload?: ChartRow;
};

function PriceDot({ cx, cy, payload }: DotProps) {
    if (cx == null || cy == null || !payload) {
        return null;
    }

    if (payload.droppedFromPrevious) {
        return (
            <g>
                <circle cx={cx} cy={cy} r={6} fill="#2563eb" />
                <circle cx={cx} cy={cy} r={2.5} fill="#ffffff" />
            </g>
        );
    }

    return <circle cx={cx} cy={cy} r={2.5} fill="#2563eb" />;
}

export default function PriceHistoryChart({ offers }: Props) {
    const chartData = buildChartData(offers);

    if (chartData.length === 0) {
        return (
            <div className="rounded-xl border bg-white p-6 text-sm text-gray-500 shadow-sm">
                価格履歴データがありません
            </div>
        );
    }

    const currentMin = chartData[chartData.length - 1].minPrice;
    const overallMin = Math.min(...chartData.map((row) => row.minPrice));

    return (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">最安値の推移</h2>

                <div className="flex flex-wrap gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-gray-500">現在 </span>
                        <span className="font-semibold text-gray-900">
              {formatCurrency(currentMin)}
            </span>
                    </div>

                    <div className="rounded-lg bg-blue-50 px-3 py-2">
                        <span className="text-blue-600">最安 </span>
                        <span className="font-semibold text-blue-700">
              {formatCurrency(overallMin)}
            </span>
                    </div>
                </div>
            </div>

            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 12, right: 20, left: 8, bottom: 8 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" minTickGap={24} />
                        <YAxis
                            width={90}
                            tickFormatter={(value) => formatCurrency(Number(value))}
                        />
                        <Tooltip
                            formatter={(value: any) => {
                                if (typeof value !== 'number') return '';
                                return formatCurrency(value);
                            }}
                            labelFormatter={(label) => `${label}`}
                        />

                        <ReferenceLine y={overallMin} strokeDasharray="4 4" />

                        <Line
                            type="monotone"
                            dataKey="minPrice"
                            strokeWidth={3}
                            dot={<PriceDot />}
                            activeDot={{ r: 5 }}
                            connectNulls
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}