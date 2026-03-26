/**
 * Channel webhook ingestion must not accept unsigned traffic on production-like deploys.
 * Vercel preview sets NODE_ENV=production for Next; use VERCEL_ENV to distinguish.
 */
export type ChannelWebhookGate =
  | { ok: true }
  | { ok: false; status: 503; error: string };

export function gateChannelWebhookSecretConfigured(
  secret: string | undefined,
  vercelEnv: string | undefined,
  nodeEnv: string | undefined,
): ChannelWebhookGate {
  const trimmed = secret?.trim();
  const strict =
    vercelEnv === "production" || (!vercelEnv && nodeEnv === "production");
  if (strict && !trimmed) {
    return {
      ok: false,
      status: 503,
      error:
        "CHANNEL_WEBHOOK_SECRET is required for channel webhooks in this environment.",
    };
  }
  return { ok: true };
}
