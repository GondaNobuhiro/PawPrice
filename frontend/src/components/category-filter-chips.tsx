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
        <div className="mb-6 space-y-3">
            <div className="mb-2 text-sm font-medium text-[#7a6657]">カテゴリ</div>

            {/* 親カテゴリ */}
            <div className="flex flex-wrap gap-2">
                <Link
                    href={buildHref('', q, sort, petType)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                        selectedCategoryId === ''
                            ? 'bg-[#d98f5c] text-white'
                            : 'border border-[#eadfce] bg-[#fffaf3] text-[#7a6657] hover:bg-[#f5e8d8]'
                    }`}
                >
                    すべて
                </Link>

                {categories.map((category) => {
                    const isActive =
                        category.id === selectedCategoryId ||
                        category.children.some((c) => c.id === selectedCategoryId);
                    return (
                        <Link
                            key={category.id}
                            href={buildHref(category.id, q, sort, petType)}
                            className={`rounded-full px-4 py-2 text-sm transition ${
                                isActive
                                    ? 'bg-[#d98f5c] text-white'
                                    : 'border border-[#eadfce] bg-[#fffaf3] text-[#7a6657] hover:bg-[#f5e8d8]'
                            }`}
                        >
                            {category.name}
                        </Link>
                    );
                })}
            </div>

            {/* 子カテゴリ（親選択時のみ表示） */}
            {selectedParent && selectedParent.children.length > 0 && (
                <div className="flex flex-wrap gap-2 border-l-2 border-[#e8d8c4] pl-4">
                    <Link
                        href={buildHref(selectedParent.id, q, sort, petType)}
                        className={`rounded-full px-3 py-1.5 text-xs transition ${
                            selectedCategoryId === selectedParent.id
                                ? 'bg-[#c97d49] text-white'
                                : 'border border-[#e8d8c4] bg-[#fdf7f0] text-[#8a7060] hover:bg-[#f5e8d8]'
                        }`}
                    >
                        すべて ({selectedParent.productCount})
                    </Link>
                    {selectedParent.children.map((child) => (
                        <Link
                            key={child.id}
                            href={buildHref(child.id, q, sort, petType)}
                            className={`rounded-full px-3 py-1.5 text-xs transition ${
                                child.id === selectedCategoryId
                                    ? 'bg-[#c97d49] text-white'
                                    : 'border border-[#e8d8c4] bg-[#fdf7f0] text-[#8a7060] hover:bg-[#f5e8d8]'
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