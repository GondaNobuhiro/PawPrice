import { prisma } from './prisma';

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
    // Genre テーブルから level 1（大カテゴリ）と level 2（中カテゴリ）を取得
    const genres = await prisma.genre.findMany({
        where: {
            platform: 'rakuten',
            isPetGenre: true,
            isActive: true,
            level: { in: [1, 2] },
            name: { not: 'その他' },
        },
        orderBy: [{ level: 'asc' }, { externalGenreId: 'asc' }],
        select: { name: true, level: true, externalGenreId: true, parentExternalGenreId: true },
    });

    const level1Genres = genres.filter((g) => g.level === 1);
    const level2Genres = genres.filter((g) => g.level === 2);
    const allGenreNames = genres.map((g) => g.name);

    // ジャンル名から Category レコードを取得（import スクリプトで name = genre.name で作成済み）
    const categories = await prisma.category.findMany({
        where: { name: { in: allGenreNames } },
        select: { id: true, code: true, name: true },
    });
    const catByName = new Map(categories.map((c) => [c.name, c]));

    // 商品数を集計
    const catIds = categories.map((c) => c.id);
    const productCounts = await prisma.product.groupBy({
        by: ['categoryId'],
        where: { isActive: true, categoryId: { in: catIds } },
        _count: { _all: true },
    });
    const countMap = new Map(productCounts.map((p) => [p.categoryId.toString(), p._count._all]));

    // 親 externalGenreId → 子ジャンル一覧のマップ
    const childrenByParent = new Map<string, typeof level2Genres>();
    for (const g of level2Genres) {
        if (!g.parentExternalGenreId) continue;
        const arr = childrenByParent.get(g.parentExternalGenreId) ?? [];
        arr.push(g);
        childrenByParent.set(g.parentExternalGenreId, arr);
    }

    return level1Genres.flatMap((parentGenre) => {
        const cat = catByName.get(parentGenre.name);
        if (!cat) return [];

        const childGenres = childrenByParent.get(parentGenre.externalGenreId) ?? [];
        const children: ChildCategory[] = childGenres.flatMap((cg) => {
            const childCat = catByName.get(cg.name);
            if (!childCat) return [];
            const productCount = countMap.get(childCat.id.toString()) ?? 0;
            if (productCount === 0) return [];
            return [{ id: childCat.id.toString(), name: cg.name, productCount }];
        });

        const childProductCount = children.reduce((sum, c) => sum + c.productCount, 0);
        const ownProductCount = countMap.get(cat.id.toString()) ?? 0;
        const productCount = ownProductCount + childProductCount;

        if (productCount === 0) return [];
        return [{ id: cat.id.toString(), code: cat.code, name: parentGenre.name, productCount, children }];
    });
}

export async function getCategories(): Promise<Category[]> {
    return fetchCategories();
}
