import Link from 'next/link';

type Props = {
    q: string;
    categoryId: string;
    petType: string;
    selectedSort: string;
    totalCount: number;
};

function buildHref(
    q: string,
    categoryId: string,
    petType: string,
    sort: string,
): string {
    const params = new URLSearchParams();

    if (q) params.set('q', q);
    if (categoryId) params.set('categoryId', categoryId);
    if (petType) params.set('petType', petType);
    if (sort) params.set('sort', sort);

    const query = params.toString();
    return query ? `/?${query}` : '/';
}

export default function SortSelect({ q, categoryId, petType, selectedSort, totalCount }: Props) {
    const options = [
        { value: 'newest', label: '新着順' },
        { value: 'price_asc', label: '安い順' },
        { value: 'price_down', label: '値下がり中' },
    ];

    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-medium text-[#7a6657]">並び替え</div>
                <div className="flex flex-wrap gap-2">
                    {options.map((option) => (
                        <Link
                            key={option.value}
                            href={buildHref(q, categoryId, petType, option.value)}
                            className={`rounded-full px-4 py-2 text-sm transition ${
                                selectedSort === option.value
                                    ? 'bg-[#c97d49] text-white'
                                    : 'border border-[#eadfce] bg-[#fffaf3] text-[#7a6657] hover:bg-[#f5e8d8]'
                            }`}
                        >
                            {option.label}
                        </Link>
                    ))}
                </div>
            </div>
            <div className="text-sm text-[#7a6657]">
                <span className="font-medium text-[#5c4331]">{totalCount.toLocaleString()}</span> 件
            </div>
        </div>
    );
}