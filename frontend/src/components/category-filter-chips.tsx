import Link from 'next/link';

type Category = {
    id: string;
    code: string;
    name: string;
    productCount?: number;
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
    return (
        <div className="mb-6">
            <div className="mb-2 text-sm font-medium text-[#7a6657]">カテゴリ</div>

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

                {categories.map((category) => (
                    <Link
                        key={category.id}
                        href={buildHref(category.id, q, sort, petType)}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                            selectedCategoryId === category.id
                                ? 'bg-[#d98f5c] text-white'
                                : 'border border-[#eadfce] bg-[#fffaf3] text-[#7a6657] hover:bg-[#f5e8d8]'
                        }`}
                    >
                        {category.name}
                        {typeof category.productCount === 'number'
                            ? ` (${category.productCount})`
                            : ''}
                    </Link>
                ))}
            </div>
        </div>
    );
}