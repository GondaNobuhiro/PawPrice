import { SpanStatusCode } from '@opentelemetry/api';

// Next.js スパンから HTTP ステータスコードを推定する
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inferStatus(span: any): number | null {
    const attrs = span.attributes ?? {};
    const spanType: string = attrs['next.span_type'] ?? '';

    // ページレンダリング スパン（Server Components）
    if (spanType === 'AppRender.getBodyResult') {
        if (span.status?.code === SpanStatusCode.ERROR) return 500;
        const route: string = attrs['next.route'] ?? '';
        return route.startsWith('/_not') ? 404 : 200;
    }

    // API ルートハンドラー スパン（http.status_code を持つ場合）
    if (typeof attrs['http.status_code'] === 'number') {
        return attrs['http.status_code'];
    }

    return null;
}

function createAccessLogExporter() {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        export(spans: any[], done: (result: { code: number }) => void) {
            for (const span of spans) {
                const status = inferStatus(span);
                if (!status) continue;

                const attrs = span.attributes ?? {};
                const durationMs = Math.round(
                    ((span.endTime[0] - span.startTime[0]) * 1e9 +
                        (span.endTime[1] - span.startTime[1])) / 1e6,
                );

                console.log(JSON.stringify({
                    type: 'access',
                    status,
                    method: attrs['http.method'] ?? '-',
                    path: attrs['next.route'] ?? attrs['http.target'] ?? '-',
                    durationMs,
                    ...(span.status?.code === SpanStatusCode.ERROR
                        ? { error: span.status.message }
                        : {}),
                }));
            }
            done({ code: 0 });
        },
        shutdown: () => Promise.resolve(),
    };
}

type Exporter = ReturnType<typeof createAccessLogExporter>;

class ImmediateSpanProcessor {
    constructor(private readonly exporter: Exporter) {}
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onStart(_span: unknown, _ctx: unknown) {}
    onEnd(span: unknown) {
        this.exporter.export([span], () => {});
    }
    forceFlush(): Promise<void> { return Promise.resolve(); }
    shutdown(): Promise<void> { return this.exporter.shutdown(); }
}

export async function register() {
    if (process.env.NEXT_RUNTIME === 'edge') return;

    const { NodeSDK } = await import('@opentelemetry/sdk-node');

    const sdk = new NodeSDK({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spanProcessors: [new ImmediateSpanProcessor(createAccessLogExporter()) as any],
    });

    sdk.start();
}
