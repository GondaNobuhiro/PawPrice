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

function pageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
        pages.push(p);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
}

export default function Pagination({ page, totalPages, q, categoryId, sort, petType }: Props) {
    if (totalPages <= 1) return null;

    const pages = pageNumbers(page, totalPages);

    return (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
            <Link
                href={buildHref(page - 1, q, categoryId, sort, petType)}
                aria-disabled={page <= 1}
                className={`rounded-xl px-3 py-2 text-sm ${
                    page <= 1
                        ? 'pointer-events-none border border-[#eadfce] bg-[#f5f0ea] text-[#c4b09a]'
                        : 'border border-[#eadfce] bg-white text-[#7a6657] hover:bg-[#f5e8d8]'
                }`}
            >
                ‹ 前へ
            </Link>

            {pages.map((p, i) =>
                p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-2 py-2 text-sm text-[#b49d88]">
                        …
                    </span>
                ) : (
                    <Link
                        key={p}
                        href={buildHref(p, q, categoryId, sort, petType)}
                        className={`min-w-[2.25rem] rounded-xl px-3 py-2 text-center text-sm ${
                            p === page
                                ? 'bg-[#d98f5c] font-medium text-white'
                                : 'border border-[#eadfce] bg-white text-[#7a6657] hover:bg-[#f5e8d8]'
                        }`}
                    >
                        {p}
                    </Link>
                ),
            )}

            <Link
                href={buildHref(page + 1, q, categoryId, sort, petType)}
                aria-disabled={page >= totalPages}
                className={`rounded-xl px-3 py-2 text-sm ${
                    page >= totalPages
                        ? 'pointer-events-none border border-[#eadfce] bg-[#f5f0ea] text-[#c4b09a]'
                        : 'border border-[#eadfce] bg-white text-[#7a6657] hover:bg-[#f5e8d8]'
                }`}
            >
                次へ ›
            </Link>
        </div>
    );
}