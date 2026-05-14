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

const PET_OPTIONS = [
    { value: '', icon: null, label: 'すべて' },
    { value: 'dog', icon: '/image/icon/dogs.jpg', label: '犬' },
    { value: 'cat', icon: '/image/icon/cats.jpg', label: '猫' },
] as const;

export default function PetTypeFilter({
    q,
    categoryId,
    sort,
    selectedPetType,
}: Props) {
    return (
        <div className="mb-5">
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E]">ペット</div>

            <div className="flex gap-2">
                {PET_OPTIONS.map((option) => {
                    const isActive = selectedPetType === option.value;
                    return (
                        <Link
                            key={option.value || 'all'}
                            href={buildHref(q, categoryId, sort, option.value)}
                            className={`flex h-[80px] w-[80px] flex-shrink-0 flex-col items-center overflow-hidden rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${
                                isActive
                                    ? 'border-2 border-[#EA580C]'
                                    : 'border-[#E7E5E4] hover:border-[#EA580C]/40'
                            }`}
                        >
                            {option.icon ? (
                                <img
                                    src={option.icon}
                                    alt=""
                                    width={80}
                                    height={50}
                                    className="h-[58px] w-full object-contain"
                                />
                            ) : (
                                <span className="flex h-[58px] w-full items-center justify-center text-2xl">🐾</span>
                            )}
                            <span className={`flex flex-1 items-center px-1 text-center text-[9px] font-medium leading-tight ${
                                isActive ? 'text-[#EA580C]' : 'text-[#57534E]'
                            }`}>
                                {option.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
