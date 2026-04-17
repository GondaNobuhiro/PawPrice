import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(_: Request, { params }: Props) {
    const { id } = await params;

    const product = await prisma.product.findUnique({
        where: {
            id: BigInt(id),
        },
        include: {
            category: true,
            brand: true,
            offers: {
                orderBy: {
                    effectivePrice: 'asc',
                },
                include: {
                    priceHistories: {
                        orderBy: {
                            fetchedAt: 'desc',
                        },
                        take: 10,
                    },
                },
            },
        },
    });

    if (!product) {
        return NextResponse.json({ message: '商品が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({
        id: product.id.toString(),
        name: product.name,
        category: product.category.name,
        brand: product.brand?.name ?? null,
        petType: product.petType,
        packageSize: product.packageSize,
        imageUrl: product.imageUrl,
        description: product.description,
        offers: product.offers.map((offer) => ({
            id: offer.id.toString(),
            shopType: offer.shopType,
            title: offer.title,
            price: offer.price,
            shippingFee: offer.shippingFee,
            pointAmount: offer.pointAmount,
            effectivePrice: offer.effectivePrice,
            externalUrl: offer.externalUrl,
            sellerName: offer.sellerName,
            availabilityStatus: offer.availabilityStatus,
            priceHistories: offer.priceHistories.map((history) => ({
                id: history.id.toString(),
                price: history.price,
                effectivePrice: history.effectivePrice,
                fetchedAt: history.fetchedAt,
            })),
        })),
    });
}