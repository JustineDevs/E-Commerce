/**
 * OpenTelemetry instrumentation for observability.
 * Set OTEL_ENABLED=true to activate. Traces are exported to the
 * configured Zipkin endpoint (default: http://localhost:9411).
 *
 * Docs: https://docs.medusajs.com/learn/debugging-and-testing/instrumentation
 */

const otelEnabled = process.env.OTEL_ENABLED?.trim().toLowerCase() === "true";

export async function register() {
  if (!otelEnabled) return;

  const { registerOtel } = await import("@medusajs/medusa");

  const zipkinUrl =
    process.env.OTEL_EXPORTER_ZIPKIN_URL?.trim() ||
    "http://localhost:9411/api/v2/spans";

  let exporter: unknown = undefined;
  try {
    const { ZipkinExporter } = await import(
      "@opentelemetry/exporter-zipkin"
    );
    exporter = new ZipkinExporter({
      serviceName: "maharlika-medusa",
      url: zipkinUrl,
    });
  } catch {
    console.warn(
      "[otel] @opentelemetry/exporter-zipkin not installed. Using default console exporter.",
    );
  }

  registerOtel({
    serviceName: "maharlika-medusa",
    ...(exporter ? { exporter: exporter as never } : {}),
    instrument: {
      http: true,
      workflows: true,
      query: true,
    },
  });
}