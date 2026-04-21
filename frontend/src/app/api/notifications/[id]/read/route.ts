import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';
import { getSessionUserId } from '@/src/app/lib/session';

type Props = {
    params: Promise<{ id: string }>;
};

export async function PATCH(_: Request, { params }: Props) {
    const [{ id }, userId] = await Promise.all([params, getSessionUserId()]);

    const notification = await prisma.notification.findUnique({
        where: { id: BigInt(id) },
    });

    if (!notification) {
        return NextResponse.json({ message: 'notification not found' }, { status: 404 });
    }

    if (notification.userId !== userId) {
        return NextResponse.json({ message: 'forbidden' }, { status: 403 });
    }

    const updated = await prisma.notification.update({
        where: { id: notification.id },
        data: { isRead: true },
    });

    return NextResponse.json({ id: updated.id.toString(), message: 'notification marked as read' });
}