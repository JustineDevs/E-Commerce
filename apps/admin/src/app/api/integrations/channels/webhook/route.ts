import { tryCreateSupabaseClient } from "@apparel-commerce/database";
import { logAdminApiEvent } from "@/lib/admin-api-log";
import { gateChannelWebhookSecretConfigured } from "@/lib/channel-webhook-policy";
import { verifyChannelWebhookSignature } from "@/lib/channel-webhook-signature";
import { getCorrelationId } from "@/lib/request-correlation";
import { correlatedJson } from "@/lib/staff-api-response";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);
  const raw = await req.text();
  const secret = process.env.CHANNEL_WEBHOOK_SECRET?.trim();
  const gate = gateChannelWebhookSecretConfigured(
    secret,
    process.env.VERCEL_ENV,
    process.env.NODE_ENV,
  );
  if (!gate.ok) {
    logAdminApiEvent({
      route: "POST /api/integrations/channels/webhook",
      correlationId,
      phase: "error",
      detail: { reason: "missing_channel_webhook_secret" },
    });
    return correlatedJson(correlationId, { error: gate.error }, { status: gate.status });
  }
  if (secret) {
    const sig = req.headers.get("x-channel-signature") ?? "";
    if (!verifyChannelWebhookSignature(raw, secret, sig)) {
      logAdminApiEvent({
        route: "POST /api/integrations/channels/webhook",
        correlationId,
        phase: "error",
        detail: { reason: "bad_signature" },
      });
      return correlatedJson(correlationId, { error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return correlatedJson(correlationId, { error: "Invalid JSON" }, { status: 400 });
  }

  let channel = "unknown";
  if (typeof payload.channel === "string") channel = payload.channel;
  else if (typeof payload.source === "string") channel = payload.source;

  let eventType = "ingest";
  if (typeof payload.event_type === "string") eventType = payload.event_type;
  else if (typeof payload.type === "string") eventType = payload.type;

  try {
    const supabase = tryCreateSupabaseClient();
    if (!supabase) {
      return correlatedJson(
        correlationId,
        {
          error: "Supabase is not configured",
          code: "SUPABASE_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }
    const { error } = await supabase.from("channel_sync_events").insert({
      channel,
      event_type: eventType,
      payload,
      metadata: { correlation_id: correlationId },
    });
    if (error) {
      logAdminApiEvent({
        route: "POST /api/integrations/channels/webhook",
        correlationId,
        phase: "error",
        detail: { db: error.message },
      });
      return correlatedJson(
        correlationId,
        { error: "Unable to persist event", detail: error.message },
        { status: 502 },
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return correlatedJson(correlationId, { error: msg }, { status: 502 });
  }

  logAdminApiEvent({
    route: "POST /api/integrations/channels/webhook",
    correlationId,
    phase: "ok",
    detail: { channel },
  });

  return correlatedJson(correlationId, { ok: true });
}
