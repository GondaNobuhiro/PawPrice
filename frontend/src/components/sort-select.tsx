import Link from 'next/link';

type Props = {
    q: string;
    category: string;
    selectedSort: string;
};

function buildHref(q: string, category: string, sort: string): string {
    const params = new URLSearchParams();

    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (sort) params.set('sort', sort);

    const query = params.toString();
    return query ? `/?${query}` : '/';
}

export default function SortSelect({
                                       q,
                                       category,
                                       selectedSort,
                                   }: Props) {
    const options = [
        { value: 'newest', label: '新着順' },
        { value: 'price_asc', label: '安い順' },
    ];

    return (
        <div className="mb-6 flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium text-gray-700">並び替え</div>

            <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                    <Link
                        key={option.value}
                        href={buildHref(q, category, option.value)}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                            selectedSort === option.value
                                ? 'bg-gray-900 text-white'
                                : 'border bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {option.label}
                    </Link>
                ))}
            </div>
        </div>
    );
}