import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// APIエンドポイント用レート制限（1分間に100リクエスト/IP）
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    // 古いエントリを間引く（メモリリーク防止）
    if (rateLimitMap.size > 5000) {
        for (const [key, val] of rateLimitMap) {
            if (now > val.resetAt) rateLimitMap.delete(key);
        }
    }

    if (!entry || now >= entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return false;
    }
    if (entry.count >= RATE_LIMIT) return true;
    entry.count++;
    return false;
}

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
    /Claude-SearchBot/i,
    /cohere-ai/i,
];

function log(status: number, request: NextRequest, ip: string) {
    console.log(JSON.stringify({
        type: 'access',
        status,
        method: request.method,
        path: request.nextUrl.pathname + (request.nextUrl.search || ''),
        ip,
        ua: (request.headers.get('user-agent') ?? '').substring(0, 150),
    }));
}

export default function middleware(request: NextRequest) {
    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        request.headers.get('x-real-ip') ??
        'unknown';

    const ua = request.headers.get('user-agent') ?? '';

    // UA未設定は正規ブラウザでは発生しないためブロック
    if (!ua) {
        log(403, request, ip);
        return new NextResponse(null, { status: 403 });
    }

    if (BOT_UA_PATTERNS.some((pattern) => pattern.test(ua))) {
        log(403, request, ip);
        return new NextResponse(null, { status: 403 });
    }

    // APIルートにレート制限を適用（session/init は除外）
    if (
        request.nextUrl.pathname.startsWith('/api/') &&
        !request.nextUrl.pathname.startsWith('/api/session/')
    ) {
        if (isRateLimited(ip)) {
            log(429, request, ip);
            return new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': '60',
                },
            });
        }
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
