'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
    q: string;
    categoryId: string;
    petType: string;
    selectedSort: string;
    totalCount: number;
};

function buildHref(q: string, categoryId: string, petType: string, sort: string): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (categoryId) params.set('categoryId', categoryId);
    if (petType) params.set('petType', petType);
    if (sort) params.set('sort', sort);
    const query = params.toString();
    return query ? `/?${query}` : '/';
}

const SORT_OPTIONS = [
    { value: 'newest',     icon: '/image/icon/newest.jpg',       label: '新着順' },
    { value: 'price_asc',  icon: '/image/icon/lowest-price.jpg', label: '安い順' },
    { value: 'price_down', icon: '/image/icon/price-drops.jpg',  label: '値下がり中' },
] as const;

export default function SortSelect({ q, categoryId, petType, selectedSort, totalCount }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [pendingSort, setPendingSort] = useState<string | null>(null);

    const handleClick = (value: string) => {
        if (isPending || value === selectedSort) return;
        setPendingSort(value);
        startTransition(() => {
            router.push(buildHref(q, categoryId, petType, value));
        });
    };

    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E]">並び替え</div>
                <div className="flex gap-2">
                    {SORT_OPTIONS.map((option) => {
                        const isActive = selectedSort === option.value;
                        const isLoading = isPending && pendingSort === option.value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleClick(option.value)}
                                disabled={isPending}
                                className={`relative flex h-[80px] w-[80px] flex-shrink-0 flex-col items-center overflow-hidden rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-wait ${
                                    isActive
                                        ? 'border-2 border-[#EA580C]'
                                        : 'border-[#E7E5E4] hover:border-[#EA580C]/40'
                                }`}
                            >
                                <img
                                    src={option.icon}
                                    alt=""
                                    width={80}
                                    height={50}
                                    className={`h-[58px] w-full object-contain transition-opacity ${isLoading ? 'opacity-30' : ''}`}
                                />
                                <span className={`flex flex-1 items-center px-1 text-center text-[9px] font-medium leading-tight ${
                                    isActive ? 'text-[#EA580C]' : 'text-[#57534E]'
                                }`}>
                                    {option.label}
                                </span>
                                {isLoading && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#EA580C] border-t-transparent" />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="pb-0.5 text-sm text-[#A8A29E]">
                {isPending ? (
                    <span className="inline-flex items-center gap-1.5 text-[#EA580C]">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#EA580C] border-t-transparent" />
                        集計中...
                    </span>
                ) : (
                    <><span className="font-semibold text-[#1C1917]">{totalCount.toLocaleString()}</span> 件</>
                )}
            </div>
        </div>
    );
}
