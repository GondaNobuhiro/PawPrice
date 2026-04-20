import { prisma } from '@/src/app/lib/prisma';

export async function GET() {
    const parentCategories = await prisma.category.findMany({
        where: {
            parentCategoryId: null,
        },
        select: {
            id: true,
            code: true,
            name: true,
            children: {
                select: {
                    id: true,
                },
            },
        },
        orderBy: {
            id: 'asc',
        },
    });

    const categoryIdsToCheck = parentCategories.flatMap((parent) => [
        parent.id,
        ...parent.children.map((child) => child.id),
    ]);

    const products = await prisma.product.groupBy({
        by: ['categoryId'],
        where: {
            isActive: true,
            categoryId: {
                in: categoryIdsToCheck,
            },
        },
        _count: {
            _all: true,
        },
    });

    const countMap = new Map<string, number>();
    for (const row of products) {
        countMap.set(row.categoryId.toString(), row._count._all);
    }

    const response = parentCategories
        .map((parent) => {
            const targetIds = [parent.id, ...parent.children.map((child) => child.id)];

            const productCount = targetIds.reduce((sum, id) => {
                return sum + (countMap.get(id.toString()) ?? 0);
            }, 0);

            return {
                id: parent.id.toString(),
                code: parent.code,
                name: parent.name,
                productCount,
            };
        })
        .filter((category) => category.productCount > 0);

    return Response.json(response);
}