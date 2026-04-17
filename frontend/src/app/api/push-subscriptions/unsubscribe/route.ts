import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

export async function POST(request: Request) {
    const body = (await request.json()) as { endpoint?: string };

    if (!body.endpoint) {
        return NextResponse.json({ message: 'endpoint is required' }, { status: 400 });
    }

    await prisma.pushSubscription.updateMany({
        where: {
            endpoint: body.endpoint,
        },
        data: {
            isActive: false,
        },
    });

    return NextResponse.json({
        message: 'push subscription deactivated',
    });
}