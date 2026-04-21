import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const existing = request.cookies.get('session_id')?.value;
    const sessionId = existing ?? crypto.randomUUID();

    // リクエストヘッダーに転送 → Server Component が同一リクエスト内で読める
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-session-id', sessionId);

    const response = NextResponse.next({ request: { headers: requestHeaders } });

    if (!existing) {
        response.cookies.set('session_id', sessionId, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 365 * 10, // 10年
            path: '/',
        });
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|sw\\.js).*)'],
};