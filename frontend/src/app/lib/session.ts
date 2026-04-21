import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './prisma';

async function resolveSessionUserId(): Promise<bigint> {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

    const sessionId =
        cookieStore.get('session_id')?.value ?? headerStore.get('x-session-id');

    if (!sessionId) {
        const path = headerStore.get('x-pathname') ?? '/';
        redirect(`/api/session/init?next=${encodeURIComponent(path)}`);
    }

    const existing = await prisma.user.findUnique({
        where: { sessionId },
        select: { id: true },
    });
    if (existing) return existing.id;

    const created = await prisma.user.create({
        data: { sessionId },
        select: { id: true },
    });
    return created.id;
}

// 同一リクエスト内で複数回呼ばれてもDBアクセスは1回
export const getSessionUserId = cache(resolveSessionUserId);