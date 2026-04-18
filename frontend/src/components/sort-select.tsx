import Link from 'next/link';

type Props = {
    q: string;
    category: string;
    petType: string;
    selectedSort: string;
};

function buildHref(
    q: string,
    category: string,
    petType: string,
    sort: string,
): string {
    const params = new URLSearchParams();

    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (petType) params.set('petType', petType);
    if (sort) params.set('sort', sort);

    const query = params.toString();
    return query ? `/?${query}` : '/';
}

export default function SortSelect({
                                       q,
                                       category,
                                       petType,
                                       selectedSort,
                                   }: Props) {
    const options = [
        { value: 'newest', label: '新着順' },
        { value: 'price_asc', label: '安い順' },
    ];

    return (
        <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium text-[#7a6657]">並び替え</div>

            <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                    <Link
                        key={option.value}
                        href={buildHref(q, category, petType, option.value)}
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
    );
}