import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

console.log('[otel] instrumentation module loaded');

function createAccessLogExporter() {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        export(spans: any[], done: (result: { code: number }) => void) {
            for (const span of spans) {
                // デバッグ: フィルタなしで全スパンを出力
                console.log(JSON.stringify({
                    debug: 'span',
                    kind: span.kind,
                    name: span.name,
                    status: span.status,
                    attrs: span.attributes,
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
        console.log('[otel] onEnd called');
        this.exporter.export([span], () => {});
    }
    forceFlush(): Promise<void> { return Promise.resolve(); }
    shutdown(): Promise<void> { return this.exporter.shutdown(); }
}

export async function register() {
    console.log('[otel] register called, NEXT_RUNTIME:', process.env.NEXT_RUNTIME);
    if (process.env.NEXT_RUNTIME === 'edge') return;

    const { NodeSDK } = await import('@opentelemetry/sdk-node');

    const sdk = new NodeSDK({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spanProcessors: [new ImmediateSpanProcessor(createAccessLogExporter()) as any],
    });

    sdk.start();
    console.log('[otel] NodeSDK started');

    // テスト用スパンで onEnd 動作を確認
    const { trace } = await import('@opentelemetry/api');
    const tracer = trace.getTracer('paw-price');
    const testSpan = tracer.startSpan('test', { kind: SpanKind.SERVER });
    testSpan.setAttribute('http.status_code', 0);
    testSpan.setAttribute('http.method', 'INIT');
    testSpan.setAttribute('http.target', '/__init__');
    testSpan.setStatus({ code: SpanStatusCode.OK });
    testSpan.end();
}
