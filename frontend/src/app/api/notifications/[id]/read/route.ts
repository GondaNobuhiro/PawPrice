import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';

const DEMO_USER_ID = BigInt(1);

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function PATCH(_: Request, { params }: Props) {
    const { id } = await params;

    const notification = await prisma.notification.findUnique({
        where: {
            id: BigInt(id),
        },
    });

    if (!notification) {
        return NextResponse.json(
            { message: 'notification not found' },
            { status: 404 },
        );
    }

    if (notification.userId !== DEMO_USER_ID) {
        return NextResponse.json(
            { message: 'forbidden' },
            { status: 403 },
        );
    }

    const updated = await prisma.notification.update({
        where: {
            id: notification.id,
        },
        data: {
            isRead: true,
        },
    });

    return NextResponse.json({
        id: updated.id.toString(),
        message: 'notification marked as read',
    });
}