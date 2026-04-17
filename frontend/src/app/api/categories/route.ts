import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

export async function GET() {
    const categories = await prisma.category.findMany({
        orderBy: {
            id: 'asc',
        },
    });

    return NextResponse.json(
        categories.map((category) => ({
            id: category.id.toString(),
            code: category.code,
            name: category.name,
        })),
    );
}