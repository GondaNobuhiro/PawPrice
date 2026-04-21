import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './prisma';

export async function getSessionUserId(): Promise<bigint> {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

    // Cookie（2回目以降）またはミドルウェアが転送したヘッダー（初回）
    const sessionId =
        cookieStore.get('session_id')?.value ?? headerStore.get('x-session-id');

    if (!sessionId) {
        const path = headerStore.get('x-pathname') ?? '/';
        redirect(`/api/session/init?next=${encodeURIComponent(path)}`);
    }

    const user = await prisma.user.upsert({
        where: { sessionId },
        create: { sessionId },
        update: {},
        select: { id: true },
    });

    return user.id;
}