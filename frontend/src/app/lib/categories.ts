import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

const CATEGORY_ORDER = [
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

const fetchCategories = unstable_cache(
    async (): Promise<Category[]> => {
    const level2Genres = await prisma.genre.findMany({
        where: { platform: 'rakuten', level: 2, isPetGenre: true, isActive: true, name: { not: 'その他' } },
        select: { name: true },
    });
    const level2Names = level2Genres.map((g) => g.name);

    const parentCategories = await prisma.category.findMany({
        where: {
            parentCategoryId: null,
            name: { in: level2Names },
        },
        select: {
            id: true,
            code: true,
            name: true,
            children: {
                select: {
                    id: true,
                    name: true,
                },
            },
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
        },
        _count: { _all: true },
    });

    const countMap = new Map<string, number>();
    for (const row of products) {
        countMap.set(row.categoryId.toString(), row._count._all);
    }

    return parentCategories
        .map((parent) => {
            const childIds = parent.children.map((child) => child.id);
            const allIds = [parent.id, ...childIds];
            const productCount = allIds.reduce((sum, id) => sum + (countMap.get(id.toString()) ?? 0), 0);
            const children = parent.children
                .map((child) => ({
                    id: child.id.toString(),
                    name: child.name,
                    productCount: countMap.get(child.id.toString()) ?? 0,
                }))
                .filter((c) => c.productCount > 0)
                .sort((a, b) => b.productCount - a.productCount);
            return { id: parent.id.toString(), code: parent.code, name: parent.name, productCount, children };
        })
        .filter((c) => c.productCount > 0)
        .sort((a, b) => {
            const ai = CATEGORY_ORDER.indexOf(a.name);
            const bi = CATEGORY_ORDER.indexOf(b.name);
            return (ai === -1 ? CATEGORY_ORDER.length : ai) - (bi === -1 ? CATEGORY_ORDER.length : bi);
        });
    },
    ['categories'],
    { revalidate: 3600 }, // 1時間キャッシュ
);

export async function getCategories(): Promise<Category[]> {
    return fetchCategories();
}
