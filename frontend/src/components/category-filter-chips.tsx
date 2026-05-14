import Link from 'next/link';

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

function buildHref(
    categoryId: string,
    q: string,
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

export default function CategoryFilterChips({
    categories,
    selectedCategoryId,
    q,
    sort,
    petType,
}: Props) {
    const selectedParent = categories.find(
        (c) =>
            c.id === selectedCategoryId ||
            c.children.some((child) => child.id === selectedCategoryId),
    );

    return (
        <div className="mb-5 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#A8A29E]">カテゴリ</div>

            {/* 親カテゴリ */}
            <div className="flex flex-wrap gap-2">
                {/* すべて */}
                <Link
                    href={buildHref('', q, sort, petType)}
                    className={`flex h-[80px] w-[80px] flex-shrink-0 flex-col items-center overflow-hidden rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${
                        selectedCategoryId === ''
                            ? 'border-2 border-[#EA580C]'
                            : 'border-[#E7E5E4] hover:border-[#EA580C]/40'
                    }`}
                >
                    <span className="flex h-[58px] w-full items-center justify-center text-2xl">🐾</span>
                    <span className={`flex flex-1 items-center px-1 text-center text-[9px] font-medium leading-tight ${
                        selectedCategoryId === '' ? 'text-[#EA580C]' : 'text-[#57534E]'
                    }`}>
                        すべて
                    </span>
                </Link>

                {categories.map((category) => {
                    const isActive =
                        category.id === selectedCategoryId ||
                        category.children.some((c) => c.id === selectedCategoryId);
                    const iconSrc = CATEGORY_ICONS[category.code];

                    return (
                        <Link
                            key={category.id}
                            href={buildHref(category.id, q, sort, petType)}
                            className={`flex h-[80px] w-[80px] flex-shrink-0 flex-col items-center overflow-hidden rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${
                                isActive
                                    ? 'border-2 border-[#EA580C]'
                                    : 'border-[#E7E5E4] hover:border-[#EA580C]/40'
                            }`}
                        >
                            {iconSrc ? (
                                <img
                                    src={iconSrc}
                                    alt=""
                                    width={80}
                                    height={50}
                                    className="h-[58px] w-full object-contain"
                                />
                            ) : (
                                <span className="flex h-[58px] w-full items-center justify-center text-2xl">📦</span>
                            )}
                            <span className={`flex flex-1 items-center px-1 text-center text-[9px] font-medium leading-tight ${
                                isActive ? 'text-[#EA580C]' : 'text-[#57534E]'
                            }`}>
                                {category.name}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {/* 子カテゴリ（親選択時のみ表示） */}
            {selectedParent && selectedParent.children.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-l-2 border-[#E7E5E4] pl-4">
                    <Link
                        href={buildHref(selectedParent.id, q, sort, petType)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                            selectedCategoryId === selectedParent.id
                                ? 'bg-[#EA580C] text-white shadow-sm'
                                : 'border border-[#E7E5E4] bg-white text-[#78716C] hover:border-[#EA580C]/40 hover:bg-orange-50 hover:text-[#EA580C]'
                        }`}
                    >
                        すべて ({selectedParent.productCount})
                    </Link>
                    {selectedParent.children.map((child) => (
                        <Link
                            key={child.id}
                            href={buildHref(child.id, q, sort, petType)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                                child.id === selectedCategoryId
                                    ? 'bg-[#EA580C] text-white shadow-sm'
                                    : 'border border-[#E7E5E4] bg-white text-[#78716C] hover:border-[#EA580C]/40 hover:bg-orange-50 hover:text-[#EA580C]'
                            }`}
                        >
                            {child.name} ({child.productCount})
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
