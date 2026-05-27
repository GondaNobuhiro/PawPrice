'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

type ChildCategory = {
    id: string;
    name: string;
    productCount: number;
};

type Category = {
    id: string;
    code: string;
    name: string;
    productCount: number;
    children: ChildCategory[];
};

type Props = {
    categories: Category[];
    selectedCategoryId: string;
    q: string;
    sort: string;
    petType: string;
};

const CATEGORY_ICONS: Record<string, string> = {
    food:      '/image/icon/food-supplements.jpg',
    snack:     '/image/icon/treats.jpg',
    toilet:    '/image/icon/toilet-supplies.jpg',
    care:      '/image/icon/grooming.jpg',
    toy:       '/image/icon/toys.jpg',
    outdoor:   '/image/icon/walking-outdoor.jpg',
    wear:      '/image/icon/wear.jpg',
    bed:       '/image/icon/beds.jpg',
    cage:      '/image/icon/cages.jpg',
    carry:     '/image/icon/carriers.jpg',
    dish:      '/image/icon/feeding.jpg',
    medical:   '/image/icon/healthcare.jpg',
    deodorant: '/image/icon/deodorizing.jpg',
};

function buildHref(categoryId: string, q: string, sort: string, petType: string): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (categoryId) params.set('categoryId', categoryId);
    if (sort) params.set('sort', sort);
    if (petType) params.set('petType', petType);
    const query = params.toString();
    return query ? `/?${query}` : '/';
}

const Spinner = () => (
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#EA580C] border-t-transparent" />
);

export default function CategoryFilterChips({ categories, selectedCategoryId, q, sort, petType }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [pendingId, setPendingId] = useState<string | null>(null);

    const handleClick = (categoryId: string) => {
        if (isPending || categoryId === selectedCategoryId) return;
        setPendingId(categoryId);
        startTransition(() => {
            router.push(buildHref(categoryId, q, sort, petType));
        });
    };

    const selectedParent = categories.find(
        (c) => c.id === selectedCategoryId || c.children.some((child) => child.id === selectedCategoryId),
    );

    return (
        <div className="mb-5 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E]">カテゴリ</div>

            {/* 親カテゴリ */}
            <div className="flex flex-wrap gap-2">
                {/* すべて */}
                <button
                    type="button"
                    onClick={() => handleClick('')}
                    disabled={isPending}
                    className={`relative flex h-[80px] w-[80px] flex-shrink-0 flex-col items-center overflow-hidden rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-wait ${
                        selectedCategoryId === '' ? 'border-2 border-[#EA580C]' : 'border-[#E7E5E4] hover:border-[#EA580C]/40'
                    }`}
                >
                    <span className={`flex h-[58px] w-full items-center justify-center text-2xl transition-opacity ${isPending && pendingId === '' ? 'opacity-30' : ''}`}>
                        🐾
                    </span>
                    <span className={`flex flex-1 items-center px-1 text-center text-[9px] font-medium leading-tight ${
                        selectedCategoryId === '' ? 'text-[#EA580C]' : 'text-[#57534E]'
                    }`}>
                        すべて
                    </span>
                    {isPending && pendingId === '' && (
                        <span className="absolute inset-0 flex items-center justify-center"><Spinner /></span>
                    )}
                </button>

                {categories.map((category) => {
                    const isActive = category.id === selectedCategoryId || category.children.some((c) => c.id === selectedCategoryId);
                    const isLoading = isPending && pendingId === category.id;
                    const iconSrc = CATEGORY_ICONS[category.code];

                    return (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => handleClick(category.id)}
                            disabled={isPending}
                            className={`relative flex h-[80px] w-[80px] flex-shrink-0 flex-col items-center overflow-hidden rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-wait ${
                                isActive ? 'border-2 border-[#EA580C]' : 'border-[#E7E5E4] hover:border-[#EA580C]/40'
                            }`}
                        >
                            {iconSrc ? (
                                <img
                                    src={iconSrc}
                                    alt=""
                                    width={80}
                                    height={50}
                                    className={`h-[58px] w-full object-contain transition-opacity ${isLoading ? 'opacity-30' : ''}`}
                                />
                            ) : (
                                <span className={`flex h-[58px] w-full items-center justify-center text-2xl transition-opacity ${isLoading ? 'opacity-30' : ''}`}>
                                    📦
                                </span>
                            )}
                            <span className={`flex flex-1 items-center px-1 text-center text-[9px] font-medium leading-tight ${
                                isActive ? 'text-[#EA580C]' : 'text-[#57534E]'
                            }`}>
                                {category.name}
                            </span>
                            {isLoading && (
                                <span className="absolute inset-0 flex items-center justify-center"><Spinner /></span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* 子カテゴリ（親選択時のみ表示） */}
            {selectedParent && selectedParent.children.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-l-2 border-[#E7E5E4] pl-4">
                    <button
                        type="button"
                        onClick={() => handleClick(selectedParent.id)}
                        disabled={isPending}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 disabled:cursor-wait ${
                            selectedCategoryId === selectedParent.id
                                ? 'bg-[#EA580C] text-white shadow-sm'
                                : 'border border-[#E7E5E4] bg-white text-[#78716C] hover:border-[#EA580C]/40 hover:bg-orange-50 hover:text-[#EA580C]'
                        } ${isPending && pendingId === selectedParent.id ? 'opacity-50' : ''}`}
                    >
                        {isPending && pendingId === selectedParent.id
                            ? <span className="inline-flex items-center gap-1"><span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />読込中</span>
                            : `すべて (${selectedParent.productCount})`
                        }
                    </button>
                    {selectedParent.children.map((child) => {
                        const isLoading = isPending && pendingId === child.id;
                        return (
                            <button
                                key={child.id}
                                type="button"
                                onClick={() => handleClick(child.id)}
                                disabled={isPending}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 disabled:cursor-wait ${
                                    child.id === selectedCategoryId
                                        ? 'bg-[#EA580C] text-white shadow-sm'
                                        : 'border border-[#E7E5E4] bg-white text-[#78716C] hover:border-[#EA580C]/40 hover:bg-orange-50 hover:text-[#EA580C]'
                                } ${isLoading ? 'opacity-50' : ''}`}
                            >
                                {isLoading
                                    ? <span className="inline-flex items-center gap-1"><span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />読込中</span>
                                    : `${child.name} (${child.productCount})`
                                }
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
