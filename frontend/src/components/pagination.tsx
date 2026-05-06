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

    // 5ページのウィンドウを現在ページ中心に配置
    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);

    // 端に寄ったときも必ず5ページ表示する
    if (end - start < 4) {
        if (start === 1) end = Math.min(total, 5);
        else start = Math.max(1, total - 4);
    }

    const pages: (number | '...')[] = [];

    if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
    }
    for (let p = start; p <= end; p++) {
        pages.push(p);
    }
    if (end < total) {
        if (end < total - 1) pages.push('...');
        pages.push(total);
    }

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