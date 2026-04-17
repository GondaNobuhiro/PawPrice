import Link from 'next/link';

type Category = {
    id: string;
    code: string;
    name: string;
};

type Props = {
    categories: Category[];
    selectedCategory: string;
    q: string;
    sort: string;
};

function buildHref(categoryCode: string, q: string, sort: string): string {
    const params = new URLSearchParams();

    if (q) {
        params.set('q', q);
    }

    if (categoryCode) {
        params.set('category', categoryCode);
    }

    if (sort) {
        params.set('sort', sort);
    }

    const query = params.toString();
    return query ? `/?${query}` : '/';
}

export default function CategoryFilterChips({
                                                categories,
                                                selectedCategory,
                                                q,
                                                sort,
                                            }: Props) {
    return (
        <div className="mb-6">
            <div className="mb-2 text-sm font-medium text-gray-700">カテゴリ</div>

            <div className="flex flex-wrap gap-2">
                <Link
                    href={buildHref('', q, sort)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                        selectedCategory === ''
                            ? 'bg-blue-600 text-white'
                            : 'border bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    すべて
                </Link>

                {categories.map((category) => (
                    <Link
                        key={category.id}
                        href={buildHref(category.code, q, sort)}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                            selectedCategory === category.code
                                ? 'bg-blue-600 text-white'
                                : 'border bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {category.name}
                    </Link>
                ))}
            </div>
        </div>
    );
}