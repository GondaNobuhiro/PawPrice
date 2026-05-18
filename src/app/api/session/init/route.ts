import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const next = request.nextUrl.searchParams.get('next') ?? '/';
    // オープンリダイレクト対策: 相対パスのみ許可
    const safePath = next.startsWith('/') ? next : '/';

    const response = NextResponse.redirect(new URL(safePath, request.url));

    if (!request.cookies.get('session_id')) {
        response.cookies.set('session_id', crypto.randomUUID(), {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 365 * 10,
            path: '/',
        });
    }

    return response;
}
