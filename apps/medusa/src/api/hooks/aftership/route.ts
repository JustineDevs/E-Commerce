import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows";
import {
  enqueueReconciliationJob,
  findPaymentAttemptByMedusaOrderId,
  markWebhookProcessed,
  mergePaymentAttemptPayloadByMedusaOrderId,
  PAYMENT_RECONCILIATION_JOB_TYPES,
  recordWebhookEvent,
  tryCreateSupabaseClient,
} from "../../../lib/payment-supabase-bridge";
import crypto from "node:crypto";
import { mapAftershipTag } from "../../../lib/aftership-status-map";
import {
  buildAftershipWebhookDedupId,
  claimAftershipWebhookDedup,
} from "../../../lib/aftership-webhook-dedup";

function verifyAftershipHmac(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
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

function logAftership(
  logger: { info?: (m: string) => void; warn?: (m: string) => void },
  event: string,
  fields: Record<string, unknown>,
): void {
  const line = JSON.stringify({ source: "aftership_webhook", event, ts: new Date().toISOString(), ...fields });
  if (event.includes("fail") || event.includes("error")) {
    logger.warn?.(line);
  } else {
    logger.info?.(line);
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as {
    info?: (m: string) => void;
    warn?: (m: string) => void;
  };

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

  const trackingId =
    typeof tracking.id === "string"
      ? tracking.id
      : typeof (tracking as { tracking_number?: string }).tracking_number === "string"
        ? (tracking as { tracking_number: string }).tracking_number
        : undefined;

  const dedupId = buildAftershipWebhookDedupId(orderId, tag);
  const isFirst = await claimAftershipWebhookDedup(dedupId);
  if (!isFirst) {
    logAftership(logger, "deduped", { order_id: orderId, dedup_id: dedupId });
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  logAftership(logger, "received", {
    order_id: orderId,
    tag: tag ?? null,
    tracking_id: trackingId ?? null,
  });

  const supabase = tryCreateSupabaseClient();
  let webhookRowId: string | undefined;
  if (supabase) {
    const rec = await recordWebhookEvent(supabase, {
      provider: "aftership",
      eventId: dedupId,
      eventType: tag ?? "unknown",
      payload: { order_id: orderId, tracking: trackingId, tag },
      payloadHash: null,
    });
    webhookRowId = rec.id ?? undefined;
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

  const mappedStatus = mapAftershipTag(tag);

  if (supabase) {
    await mergePaymentAttemptPayloadByMedusaOrderId(supabase, orderId, {
      aftership_tag: tag ?? null,
      aftership_status: mappedStatus,
      aftership_tracking_id: trackingId ?? null,
      aftership_last_checkpoint: lastCheckpoint || null,
      ...(mappedStatus === "delivered"
        ? { aftership_delivered_at: new Date().toISOString() }
        : {}),
    }).catch(() => {});
  }

  if (mappedStatus === "delivered") {
    logAftership(logger, "delivered_processing", { order_id: orderId });
    try {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
      const { data: orders } = await query.graph({
        entity: "order",
        fields: ["payment_collections.*", "payment_collections.payments.*"],
        filters: { id: orderId },
      });
      const order = orders?.[0] as
        | {
            payment_collections?: Array<{
              payments?: Array<{ id: string; provider_id?: string; captured_at?: string | null }>;
            }>;
          }
        | undefined;
      const payments = order?.payment_collections?.[0]?.payments ?? [];
      const uncapturedCod = payments.find(
        (p) => p.provider_id?.toLowerCase().includes("cod") && !p.captured_at,
      );

      if (uncapturedCod) {
        if (supabase) {
          const attempt = await findPaymentAttemptByMedusaOrderId(supabase, orderId);
          if (attempt) {
            const prev =
              attempt.provider_payload && typeof attempt.provider_payload === "object"
                ? (attempt.provider_payload as Record<string, unknown>)
                : {};
            if (prev.cod_capture_complete === true) {
              logAftership(logger, "capture_skipped_already_captured", { order_id: orderId });
              if (webhookRowId) await markWebhookProcessed(supabase, webhookRowId, true);
              res.status(200).json({ received: true, cod_capture: "already_captured" });
              return;
            }
          }
          await mergePaymentAttemptPayloadByMedusaOrderId(supabase, orderId, {
            cod_capture_started_at: new Date().toISOString(),
            cod_capture_source_pending: "aftership_webhook",
          }).catch(() => {});
        }

        logAftership(logger, "capture_started", { order_id: orderId, payment_id: uncapturedCod.id });

        await capturePaymentWorkflow(req.scope).run({
          input: { payment_id: uncapturedCod.id },
        });

        logAftership(logger, "capture_success", { order_id: orderId, payment_id: uncapturedCod.id });

        if (supabase) {
          await mergePaymentAttemptPayloadByMedusaOrderId(supabase, orderId, {
            cod_capture_complete: true,
            cod_capture_source: "aftership_webhook",
            cod_captured_at: new Date().toISOString(),
          }).catch(() => {});
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logAftership(logger, "capture_failed", { order_id: orderId, error: msg });
      if (supabase) {
        await mergePaymentAttemptPayloadByMedusaOrderId(supabase, orderId, {
          cod_capture_last_error: msg.slice(0, 500),
          cod_needs_review: true,
        }).catch(() => {});
        await enqueueReconciliationJob(
          supabase,
          PAYMENT_RECONCILIATION_JOB_TYPES.CAPTURE_COD_PAYMENT,
          { order_id: orderId, reason: "aftership_capture_failed", error: msg },
          "aftership",
        ).catch(() => {});
      }
    }
  }

  if (supabase && webhookRowId) {
    await markWebhookProcessed(supabase, webhookRowId, true).catch(() => {});
  }

  res.status(200).json({ received: true });
}
