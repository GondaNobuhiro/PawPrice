import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from './prisma';

// Lambdaウォーム中は sessionId→userId をメモリキャッシュ（DB不要）
const sessionCache = new Map<string, bigint>();

async function resolveSessionUserId(): Promise<bigint> {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

    const sessionId =
        cookieStore.get('session_id')?.value ?? headerStore.get('x-session-id');

    if (!sessionId) {
        const path = headerStore.get('x-pathname') ?? '/';
        redirect(`/api/session/init?next=${encodeURIComponent(path)}`);
    }

    const cached = sessionCache.get(sessionId);
    if (cached !== undefined) return cached;

    const existing = await prisma.user.findUnique({
        where: { sessionId },
        select: { id: true },
    });

    const userId = existing
        ? existing.id
        : (await prisma.user.create({ data: { sessionId }, select: { id: true } })).id;

    sessionCache.set(sessionId, userId);
    return userId;
}

// 同一リクエスト内で複数回呼ばれてもDBアクセスは1回
export const getSessionUserId = cache(resolveSessionUserId);

// 公開ページ用: セッションなし（クローラー等）の場合は null を返し、リダイレクトしない
async function resolveOptionalSessionUserId(): Promise<bigint | null> {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
    const sessionId =
        cookieStore.get('session_id')?.value ?? headerStore.get('x-session-id');
    if (!sessionId) return null;

    const cached = sessionCache.get(sessionId);
    if (cached !== undefined) return cached;

    const existing = await prisma.user.findUnique({
        where: { sessionId },
        select: { id: true },
    });
    if (!existing) return null;

    sessionCache.set(sessionId, existing.id);
    return existing.id;
}

export const getOptionalSessionUserId = cache(resolveOptionalSessionUserId);