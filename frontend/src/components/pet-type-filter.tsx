import Link from 'next/link';

type Props = {
    q: string;
    category: string;
    sort: string;
    selectedPetType: string;
};

function buildHref(
    q: string,
    category: string,
    sort: string,
    petType: string,
): string {
    const params = new URLSearchParams();

    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (sort) params.set('sort', sort);
    if (petType) params.set('petType', petType);

    const query = params.toString();
    return query ? `/?${query}` : '/';
}

export default function PetTypeFilter({
                                          q,
                                          category,
                                          sort,
                                          selectedPetType,
                                      }: Props) {
    const options = [
        { value: '', label: 'すべて' },
        { value: 'dog', label: '犬' },
        { value: 'cat', label: '猫' },
    ];

    return (
        <div className="mb-6">
            <div className="mb-2 text-sm font-medium text-gray-700">対象ペット</div>

            <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                    <Link
                        key={option.value || 'all'}
                        href={buildHref(q, category, sort, option.value)}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                            selectedPetType === option.value
                                ? 'bg-emerald-600 text-white'
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