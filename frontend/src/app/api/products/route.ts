import { prisma } from '@/src/app/lib/prisma';

const PAGE_SIZE = 20;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q')?.trim() ?? '';
    const categoryId = searchParams.get('categoryId')?.trim() ?? '';
    const sort = searchParams.get('sort')?.trim() ?? 'newest';
    const page = Number(searchParams.get('page') ?? '1');

    const currentPage = Number.isNaN(page) || page < 1 ? 1 : page;

    let targetCategoryIds: bigint[] | undefined = undefined;

    if (categoryId) {
        const selectedCategory = await prisma.category.findUnique({
            where: {
                id: BigInt(categoryId),
            },
            select: {
                id: true,
                parentCategoryId: true,
                children: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (selectedCategory) {
            if (selectedCategory.parentCategoryId === null) {
                targetCategoryIds = [
                    selectedCategory.id,
                    ...selectedCategory.children.map((child) => child.id),
                ];
            } else {
                targetCategoryIds = [selectedCategory.id];
            }
        }
    }

    const where = {
        isActive: true,
        ...(q
            ? {
                OR: [
                    {
                        name: {
                            contains: q,
                            mode: 'insensitive' as const,
                        },
                    },
                    {
                        normalizedName: {
                            contains: q,
                            mode: 'insensitive' as const,
                        },
                    },
                ],
            }
            : {}),
        ...(targetCategoryIds
            ? {
                categoryId: {
                    in: targetCategoryIds,
                },
            }
            : {}),
    };

    const totalCount = await prisma.product.count({ where });

    const products = await prisma.product.findMany({
        where,
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy:
            sort === 'newest'
                ? {
                    createdAt: 'desc',
                }
                : {
                    createdAt: 'desc',
                },
        include: {
            category: {
                select: {
                    id: true,
                    name: true,
                    parentCategoryId: true,
                    parent: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            brand: {
                select: {
                    id: true,
                    name: true,
                },
            },
            offers: {
                where: {
                    isActive: true,
                },
                orderBy: {
                    effectivePrice: 'asc',
                },
                take: 1,
                select: {
                    id: true,
                    shopType: true,
                    sellerName: true,
                    price: true,
                    shippingFee: true,
                    pointAmount: true,
                    effectivePrice: true,
                    externalUrl: true,
                    imageUrl: true,
                },
            },
            _count: {
                select: {
                    offers: {
                        where: {
                            isActive: true,
                        },
                    },
                },
            },
        },
    });

    const items = products.map((product) => {
        const lowestOffer = product.offers[0]
            ? {
                id: product.offers[0].id.toString(),
                shopType: product.offers[0].shopType,
                sellerName: product.offers[0].sellerName,
                price: product.offers[0].price,
                shippingFee: product.offers[0].shippingFee,
                pointAmount: product.offers[0].pointAmount,
                effectivePrice: product.offers[0].effectivePrice,
                externalUrl: product.offers[0].externalUrl,
                imageUrl: product.offers[0].imageUrl,
            }
            : null;

        return {
            id: product.id.toString(),
            name: product.name,
            imageUrl: product.imageUrl,
            brand: product.brand?.name ?? null,
            category: product.category.parent?.name ?? product.category.name,
            subCategory: product.category.parent ? product.category.name : null,
            packageSize: product.packageSize,
            petType: product.petType,
            offersCount: product._count.offers,
            lowestOffer,

            // 画面側が期待している priceSummary を常に返す
            priceSummary: {
                isPriceDown: false,
                latestEffectivePrice: lowestOffer?.effectivePrice ?? null,
                historicalMinPrice: lowestOffer?.effectivePrice ?? null,
                previousEffectivePrice: null,
                diffAmount: null,
                diffPercent: null,
            },
        };
    });

    return Response.json({
        items,
        pagination: {
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalCount,
            totalPages: Math.ceil(totalCount / PAGE_SIZE),
        },
    });
}