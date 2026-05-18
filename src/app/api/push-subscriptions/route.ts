import { NextResponse } from 'next/server';
import { prisma } from '@/src/app/lib/prisma';
import { getSessionUserId } from '@/src/app/lib/session';

type PushSubscriptionBody = {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
};

export async function POST(request: Request) {
    const body = (await request.json()) as PushSubscriptionBody;

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
        return NextResponse.json({ message: 'invalid subscription' }, { status: 400 });
    }

    const userId = await getSessionUserId();

    const subscription = await prisma.pushSubscription.upsert({
        where: { endpoint: body.endpoint },
        update: { p256dhKey: body.keys.p256dh, authKey: body.keys.auth, isActive: true, userId },
        create: { userId, endpoint: body.endpoint, p256dhKey: body.keys.p256dh, authKey: body.keys.auth, isActive: true },
    });

    return NextResponse.json({ id: subscription.id.toString(), message: 'push subscription saved' });
}