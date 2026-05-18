import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BOT_UA_PATTERNS = [
    // ヘッドレスブラウザ・スクレイパー
    /HeadlessChrome/i,
    /PhantomJS/i,
    /Selenium/i,
    /Puppeteer/i,
    /Playwright/i,
    // AIクローラー
    /GPTBot/i,
    /ClaudeBot/i,
    /PerplexityBot/i,
    /CCBot/i,
    /Amazonbot/i,
    /anthropic-ai/i,
    /cohere-ai/i,
];

export default function middleware(request: NextRequest) {
    const ua = request.headers.get('user-agent') ?? '';
    if (BOT_UA_PATTERNS.some((pattern) => pattern.test(ua))) {
        return new NextResponse(null, { status: 403 });
    }

    const existing = request.cookies.get('session_id')?.value;
    const sessionId = existing ?? crypto.randomUUID();

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-session-id', sessionId);
    requestHeaders.set('x-pathname', request.nextUrl.pathname);

    const response = NextResponse.next({ request: { headers: requestHeaders } });

    if (!existing) {
        response.cookies.set('session_id', sessionId, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 365 * 10,
            path: '/',
        });
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|sw\\.js|logo\\.png|image/|icon\\.png|manifest\\.json).*)'],
};
