import { createHmac } from "node:crypto";

type LoggerLike = {
  info?: (msg: string) => void;
};

/**
 * Structured funnel + platform audit row + optional HTTP sink.
 */
export async function emitOrderPlacedFunnelEvent(params: {
  logger: LoggerLike;
  orderId: string;
  displayId: string;
  channel: string;
}): Promise<void> {
  const payload = {
    event: "commerce_funnel_order_placed",
    order_id: params.orderId,
    display_id: params.displayId,
    channel: params.channel,
    ts: new Date().toISOString(),
  };
  params.logger.info?.(JSON.stringify(payload));

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(supabaseUrl, supabaseKey);
      await sb.from("audit_logs").insert({
        action: "commerce_funnel_order_placed",
        resource: params.orderId,
        details: {
          display_id: params.displayId,
          channel: params.channel,
        },
      });
    } catch {
      // sink failure must not block email or order flow
    }
  }

  const sinkUrl = process.env.COMMERCE_FUNNEL_SINK_URL?.trim();
  const sinkSecret = process.env.COMMERCE_FUNNEL_SINK_SECRET?.trim();
  if (sinkUrl && sinkSecret) {
    const body = JSON.stringify(payload);
    const sig = createHmac("sha256", sinkSecret).update(body).digest("hex");
    try {
      await fetch(sinkUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Commerce-Funnel-Signature": sig,
        },
        body,
      });
    } catch {
      // optional
    }
  }
}
