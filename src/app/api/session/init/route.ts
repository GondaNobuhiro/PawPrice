import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const next = request.nextUrl.searchParams.get('next') ?? '/';
    // オープンリダイレクト対策: 相対パスのみ許可
    const safePath = next.startsWith('/') ? next : '/';

    // Amplify WEB_COMPUTE の Lambda では request.url が localhost:3000 になるため
    // x-forwarded-host または NEXT_PUBLIC_APP_URL からベース URL を組み立てる
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') ?? 'https';
    const baseUrl = host
        ? `${proto}://${host}`
        : (process.env.NEXT_PUBLIC_APP_URL ?? request.url);
    const response = NextResponse.redirect(new URL(safePath, baseUrl));

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
