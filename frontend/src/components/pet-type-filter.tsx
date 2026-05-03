import Link from 'next/link';

type Props = {
    q: string;
    categoryId: string;
    sort: string;
    selectedPetType: string;
};

function buildHref(
    q: string,
    categoryId: string,
    sort: string,
    petType: string,
): string {
    const params = new URLSearchParams();

    if (q) params.set('q', q);
    if (categoryId) params.set('categoryId', categoryId);
    if (sort) params.set('sort', sort);
    if (petType) params.set('petType', petType);

    const query = params.toString();
    return query ? `/?${query}` : '/';
}

export default function PetTypeFilter({
    q,
    categoryId,
    sort,
    selectedPetType,
}: Props) {
    const options = [
        { value: '', label: '🐾 すべて' },
        { value: 'dog', label: '🐕 犬' },
        { value: 'cat', label: '🐈 猫' },
    ];

    return (
        <div className="mb-6">
            <div className="mb-2 text-sm font-medium text-gray-500">ペット</div>

            <div className="flex flex-wrap gap-2">
                {options.map((option) => (
                    <Link
                        key={option.value || 'all'}
                        href={buildHref(q, categoryId, sort, option.value)}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                            selectedPetType === option.value
                                ? 'bg-[#0ea5e9] text-white shadow-sm'
                                : 'border border-sky-200 bg-white text-gray-600 hover:bg-sky-50'
                        }`}
                    >
                        {option.label}
                    </Link>
                ))}
            </div>
        </div>
    );
}
