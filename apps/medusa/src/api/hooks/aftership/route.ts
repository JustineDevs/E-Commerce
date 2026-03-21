import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows";
import crypto from "node:crypto";
import { buildAftershipWebhookDedupId, claimAftershipWebhookDedup } from "../../../lib/aftership-webhook-dedup.js";

function verifyAftershipHmac(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader) {
    return false;
  }
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(signatureHeader, "utf8");
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function pickMedusaOrderId(tracking: Record<string, unknown>): string | undefined {
  const custom = tracking.custom_fields as Record<string, unknown> | undefined;
  if (custom && typeof custom.medusa_order_id === "string" && custom.medusa_order_id.trim()) {
    return custom.medusa_order_id.trim();
  }
  const direct = tracking.order_id;
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }
  return undefined;
}

function mapAftershipTag(tag: string | undefined): string {
  const t = (tag ?? "").toLowerCase().replace(/[\s_]/g, "");
  if (t === "delivered") return "delivered";
  if (t === "outfordelivery") return "out_for_delivery";
  if (t === "intransit") return "in_transit";
  if (t === "pending" || t === "inforeceived") return "pending";
  return "in_transit";
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const secret = process.env.AFTERSHIP_WEBHOOK_SECRET?.trim();
  if (!secret) {
    res.status(503).json({ error: "Webhook signing not configured", code: "WEBHOOK_DISABLED" });
    return;
  }

  const raw = req.rawBody;
  if (!Buffer.isBuffer(raw)) {
    res.status(400).json({ error: "Invalid body", code: "INVALID_BODY" });
    return;
  }

  const signature =
    (req.headers["aftership-hmac-sha256"] as string | undefined) ??
    (req.headers["x-aftership-signature"] as string | undefined);

  if (!verifyAftershipHmac(raw, signature, secret)) {
    res.status(401).json({ error: "Invalid signature", code: "INVALID_WEBHOOK_SIGNATURE" });
    return;
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: "Invalid JSON", code: "INVALID_JSON" });
    return;
  }

  const msg = payload.msg as Record<string, unknown> | undefined;
  const tracking = (msg?.tracking ?? payload.tracking) as Record<string, unknown> | undefined;
  if (!tracking) {
    res.status(200).json({ received: true, skipped: true });
    return;
  }

  const orderId = pickMedusaOrderId(tracking);
  if (!orderId) {
    res.status(200).json({ received: true, skipped: true });
    return;
  }

  const tag =
    (tracking.tag as string | undefined) ??
    (tracking.subtag_message as string | undefined) ??
    (tracking.subtag as string | undefined);

  const dedupId = buildAftershipWebhookDedupId(orderId, tag);
  const isFirst = await claimAftershipWebhookDedup(dedupId);
  if (!isFirst) {
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  const checkpoints = tracking.checkpoints as
    | Array<{ message?: string; checkpoint_time?: string }>
    | undefined;
  const lastCheckpoint =
    checkpoints && checkpoints.length > 0
      ? [checkpoints[checkpoints.length - 1]?.message, checkpoints[checkpoints.length - 1]?.checkpoint_time]
          .filter(Boolean)
          .join(" · ")
      : "";

  const orderModule = req.scope.resolve(Modules.ORDER);
  const existing = await orderModule.retrieveOrder(orderId, {
    select: ["id", "metadata"],
  });

  await orderModule.updateOrders(orderId, {
    metadata: {
      ...((existing.metadata as Record<string, unknown>) ?? {}),
      aftership_tag: tag ?? null,
      aftership_status: mapAftershipTag(tag),
      aftership_last_checkpoint: lastCheckpoint || null,
      aftership_updated_at: new Date().toISOString(),
    },
  });

  // When J&T delivers, capture COD payment (authorized at checkout, captured on delivery)
  const mappedStatus = mapAftershipTag(tag);
  if (mappedStatus === "delivered") {
    try {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
      const { data: orders } = await query.graph({
        entity: "order",
        fields: ["payment_collections.*", "payment_collections.payments.*"],
        filters: { id: orderId },
      });
      const order = orders?.[0] as
        | { payment_collections?: Array<{ payments?: Array<{ id: string; provider_id?: string; captured_at?: string | null }> }> }
        | undefined;
      const payments = order?.payment_collections?.[0]?.payments ?? [];
      const uncapturedCod = payments.find(
        (p) =>
          p.provider_id?.toLowerCase().includes("cod") &&
          !p.captured_at,
      );
      if (uncapturedCod) {
        await capturePaymentWorkflow(req.scope).run({
          input: { payment_id: uncapturedCod.id },
        });
      }
    } catch (err) {
      const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
        warn?: (m: string) => void;
      };
      logger.warn?.(
        `[aftership] COD capture on delivery failed for order ${orderId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  res.status(200).json({ received: true });
}
