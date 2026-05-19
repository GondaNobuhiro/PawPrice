import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

function createAccessLogExporter() {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        export(spans: any[], done: (result: { code: number }) => void) {
            for (const span of spans) {
                if (span.kind !== SpanKind.SERVER) continue;

                const status: number | undefined =
                    span.attributes['http.status_code'] ??
                    span.attributes['http.response.status_code'] ??
                    span.attributes['http.statusCode'];

                if (!status) continue;

                const durationMs = Math.round(
                    ((span.endTime[0] - span.startTime[0]) * 1e9 +
                        (span.endTime[1] - span.startTime[1])) / 1e6,
                );

                console.log(JSON.stringify({
                    type: 'access',
                    status,
                    method:
                        span.attributes['http.method'] ??
                        span.attributes['http.request.method'],
                    path:
                        span.attributes['http.target'] ??
                        span.attributes['url.path'] ??
                        span.attributes['http.url'],
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

// BatchSpanProcessor はタイマーで一括送信するため Lambda 終了前に出力されない。
// Span 完了直後に即座にエクスポートする独自プロセッサーを使用する。
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
