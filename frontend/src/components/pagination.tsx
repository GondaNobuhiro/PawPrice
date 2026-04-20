import Link from 'next/link';

type Props = {
    page: number;
    totalPages: number;
    q: string;
    categoryId: string;
    sort: string;
    petType: string;
};

function buildHref(
    page: number,
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
    if (page > 1) params.set('page', String(page));

    const query = params.toString();
    return query ? `/?${query}` : '/';
}

export default function Pagination({
                                       page,
                                       totalPages,
                                       q,
                                       categoryId,
                                       sort,
                                       petType,
                                   }: Props) {
    if (totalPages <= 1) {
        return null;
    }

    return (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
                href={buildHref(page - 1, q, categoryId, sort, petType)}
                className={`rounded-xl px-4 py-2 text-sm ${
                    page <= 1
                        ? 'pointer-events-none border bg-gray-100 text-gray-400'
                        : 'border bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
                前へ
            </Link>

            <div className="text-sm text-gray-600">
                {page} / {totalPages} ページ
            </div>

            <Link
                href={buildHref(page + 1, q, categoryId, sort, petType)}
                className={`rounded-xl px-4 py-2 text-sm ${
                    page >= totalPages
                        ? 'pointer-events-none border bg-gray-100 text-gray-400'
                        : 'border bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
                次へ
            </Link>
        </div>
    );
}