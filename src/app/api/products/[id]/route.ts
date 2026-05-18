import { NextResponse } from 'next/server';
import { getProduct } from '@/src/app/lib/products';

type Props = {
    params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Props) {
    const { id } = await params;
    const product = await getProduct(id);
    if (!product) {
        return NextResponse.json({ message: '商品が見つかりません' }, { status: 404 });
    }
    return NextResponse.json(product);
}