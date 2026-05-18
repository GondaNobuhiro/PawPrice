import { prisma } from './prisma';

// 表示するトップレベルカテゴリのコード（DB内の code 値）
const PARENT_CATEGORY_CODES = [
    'food',
    'snack',
    'toilet',
    'care',
    'toy',
    'outdoor',
    'wear',
    'bed',
    'cage',
    'carry',
    'dish',
    'medical',
    'deodorant',
];

// 表示順
const PARENT_CATEGORY_ORDER = [
    'food',
    'snack',
    'toilet',
    'care',
    'toy',
    'outdoor',
    'wear',
    'bed',
    'cage',
    'carry',
    'dish',
    'medical',
    'deodorant',
];

export type ChildCategory = {
    id: string;
    name: string;
    productCount: number;
};

export type Category = {
    id: string;
    code: string;
    name: string;
    productCount: number;
    children: ChildCategory[];
};

async function fetchCategories(): Promise<Category[]> {
    const parentCategories = await prisma.category.findMany({
        where: { code: { in: PARENT_CATEGORY_CODES } },
        select: {
            id: true,
            code: true,
            name: true,
            children: { select: { id: true, name: true } },
        },
        orderBy: { id: 'asc' },
    });

    const categoryIdsToCheck = parentCategories.flatMap((parent) => [
        parent.id,
        ...parent.children.map((child) => child.id),
    ]);

    const products = await prisma.product.groupBy({
        by: ['categoryId'],
        where: {
            isActive: true,
            categoryId: { in: categoryIdsToCheck },
            offers: { some: { isActive: true } },
        },
        _count: { _all: true },
    });

    const countMap = new Map<string, number>();
    for (const row of products) {
        countMap.set(row.categoryId.toString(), row._count._all);
    }

    return parentCategories
        .map((parent) => {
            const allIds = [parent.id, ...parent.children.map((c) => c.id)];
            const productCount = allIds.reduce((sum, id) => sum + (countMap.get(id.toString()) ?? 0), 0);
            const children = parent.children
                .map((child) => ({
                    id: child.id.toString(),
                    name: child.name,
                    productCount: countMap.get(child.id.toString()) ?? 0,
                }))
                .filter((c) => c.productCount > 0);
            return { id: parent.id.toString(), code: parent.code, name: parent.name, productCount, children };
        })
        .filter((c) => c.productCount > 0)
        .sort((a, b) => {
            const ai = PARENT_CATEGORY_ORDER.indexOf(a.code);
            const bi = PARENT_CATEGORY_ORDER.indexOf(b.code);
            return (ai === -1 ? PARENT_CATEGORY_ORDER.length : ai) - (bi === -1 ? PARENT_CATEGORY_ORDER.length : bi);
        });
}

export async function getCategories(): Promise<Category[]> {
    return fetchCategories();
}
