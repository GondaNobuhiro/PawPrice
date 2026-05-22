import { SpanStatusCode } from '@opentelemetry/api';

function createAccessLogExporter() {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        export(spans: any[], done: (result: { code: number }) => void) {
            for (const span of spans) {
                const attrs = span.attributes ?? {};

                // HTTP サーバースパン（instrumentation-http が自動生成）
                // http.user_agent・net.peer.ip・http.status_code を持つ incoming リクエストのみ対象
                const isHttpServer =
                    span.kind === 1 /* SpanKind.SERVER */ &&
                    typeof attrs['http.status_code'] === 'number' &&
                    typeof attrs['http.method'] === 'string';

                if (!isHttpServer) continue;

                // Next.js が http.route にルートパターン（/products/[id] 等）を付与する場合はそちらを優先
                const path = attrs['http.route'] ?? attrs['http.target'] ?? attrs['url.path'] ?? '-';
                const status: number = attrs['http.status_code'];

                const durationMs = Math.round(
                    ((span.endTime[0] - span.startTime[0]) * 1e9 +
                        (span.endTime[1] - span.startTime[1])) / 1e6,
                );

                console.log(JSON.stringify({
                    type: 'access',
                    status,
                    method: attrs['http.method'],
                    path,
                    ip: attrs['net.peer.ip'] ?? attrs['client.address'] ?? '-',
                    ua: (attrs['http.user_agent'] ?? attrs['user_agent.original'] ?? '-').substring(0, 150),
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
    const { HttpInstrumentation } = await import('@opentelemetry/instrumentation-http');

    const sdk = new NodeSDK({
        instrumentations: [new HttpInstrumentation()],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spanProcessors: [new ImmediateSpanProcessor(createAccessLogExporter()) as any],
    });

    sdk.start();
}
