import { prisma } from './prisma';

const PARENT_CATEGORY_ORDER = [
    '犬用品',
    '猫用品',
    'ペット用お手入れ用品',
    'ペット用食器・給水器・給餌器',
    'ペット用仏具',
    '室内ペット用家電',
    '動物用検査キット',
    'ペット用応急手当',
    '動物用医薬品',
    '動物用医療機器',
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
        where: { parentCategoryId: null, code: { startsWith: 'rakuten_genre_' } },
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
        where: { isActive: true, categoryId: { in: categoryIdsToCheck } },
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
            const ai = PARENT_CATEGORY_ORDER.indexOf(a.name);
            const bi = PARENT_CATEGORY_ORDER.indexOf(b.name);
            return (ai === -1 ? PARENT_CATEGORY_ORDER.length : ai) - (bi === -1 ? PARENT_CATEGORY_ORDER.length : bi);
        });
}

export async function getCategories(): Promise<Category[]> {
    return fetchCategories();
}
