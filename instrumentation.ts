import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

function createAccessLogExporter() {
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        export(spans: any[], done: (result: { code: number }) => void) {
            for (const span of spans) {
                if (span.kind !== SpanKind.SERVER) continue;

                const status: number | undefined =
                    span.attributes['http.status_code'] ??
                    span.attributes['http.response.status_code'];

                if (!status) continue;

                const durationMs = Math.round(
                    ((span.endTime[0] - span.startTime[0]) * 1e9 +
                        (span.endTime[1] - span.startTime[1])) / 1e6,
                );

                console.log(JSON.stringify({
                    type: 'access',
                    status,
                    method: span.attributes['http.method'],
                    path: span.attributes['http.target'] ?? span.attributes['url.path'],
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

export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const { NodeSDK } = await import('@opentelemetry/sdk-node');

    const sdk = new NodeSDK({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        traceExporter: createAccessLogExporter() as any,
    });

    sdk.start();
}
