import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);

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
        <div className="mt-8 flex flex-wrap items-center justify-center gap-1">
            <Link
                href={buildHref(page - 1, q, categoryId, sort, petType)}
                aria-disabled={page <= 1}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-all ${
                    page <= 1
                        ? 'pointer-events-none text-[#C4BAB4]'
                        : 'border border-[#E7E5E4] bg-white text-[#78716C] hover:bg-[#F5F4F3] hover:text-[#1C1917]'
                }`}
            >
                <ChevronLeft className="h-4 w-4" />
            </Link>

            {pages.map((p, i) =>
                p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-1 py-2 text-sm text-[#C4BAB4]">
                        …
                    </span>
                ) : (
                    <Link
                        key={p}
                        href={buildHref(p, q, categoryId, sort, petType)}
                        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm transition-all ${
                            p === page
                                ? 'bg-[#0284c7] font-medium text-white shadow-sm'
                                : 'border border-[#E7E5E4] bg-white text-[#78716C] hover:bg-[#F5F4F3] hover:text-[#1C1917]'
                        }`}
                    >
                        {p}
                    </Link>
                ),
            )}

            <Link
                href={buildHref(page + 1, q, categoryId, sort, petType)}
                aria-disabled={page >= totalPages}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-all ${
                    page >= totalPages
                        ? 'pointer-events-none text-[#C4BAB4]'
                        : 'border border-[#E7E5E4] bg-white text-[#78716C] hover:bg-[#F5F4F3] hover:text-[#1C1917]'
                }`}
            >
                <ChevronRight className="h-4 w-4" />
            </Link>
        </div>
    );
}
