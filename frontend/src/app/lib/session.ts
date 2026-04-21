import { cookies, headers } from 'next/headers';
import { prisma } from './prisma';

export async function getSessionUserId(): Promise<bigint> {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

    // Cookie（2回目以降）またはミドルウェアが転送したヘッダー（初回）
    const sessionId =
        cookieStore.get('session_id')?.value ?? headerStore.get('x-session-id');

    if (!sessionId) {
        throw new Error('session_id not found');
    }

    const user = await prisma.user.upsert({
        where: { sessionId },
        create: { sessionId },
        update: {},
        select: { id: true },
    });

    return user.id;
}