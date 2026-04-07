import crypto from "node:crypto";

import { mapAftershipTag } from "../../../lib/aftership-status-map";
import { buildAftershipWebhookDedupId } from "../../../lib/aftership-webhook-dedup";

export type AftershipParsedEvent = {
  orderId: string;
  tag: string | undefined;
  trackingId: string | undefined;
  dedupId: string;
  mappedStatus: string;
  lastCheckpoint: string;
};

export type AftershipRouteResult = {
  status: number;
  body: Record<string, unknown>;
};

export type AftershipCodCaptureState =
  | { paymentId: string; alreadyCaptured: boolean }
  | null;

type PrepareInput = {
  secret: string | undefined;
  rawBody: Buffer | undefined;
  signatureHeader: string | undefined;
};

type ApplyInput = {
  parsed: AftershipParsedEvent;
  claimDedup: (_dedupId: string) => Promise<boolean>;
  recordWebhookEvent: (_input: {
    provider: string;
    eventId: string;
    eventType?: string;
    payload: Record<string, unknown>;
    payloadHash?: string | null;
  }) => Promise<{ inserted: boolean; id?: string }>;
  updateOrderMetadata: (_orderId: string, _metadata: Record<string, unknown>) => Promise<void>;
  mergePaymentAttemptPayload: (
    _orderId: string,
    _merge: Record<string, unknown>,
  ) => Promise<void>;
  getCodCaptureState: (_orderId: string) => Promise<AftershipCodCaptureState>;
  captureCodPayment: (_paymentId: string) => Promise<void>;
  enqueueCaptureRetry: (_orderId: string, _error: string) => Promise<void>;
  markWebhookProcessed: (_id: string, _ok: boolean, _error?: string) => Promise<void>;
  nowIso: () => string;
  log: (_event: string, _fields: Record<string, unknown>) => void;
};

type TrackingEnvelope = {
  msg?: { tracking?: Record<string, unknown> };
  tracking?: Record<string, unknown>;
};

export function verifyAftershipHmac(
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

export function pickMedusaOrderId(tracking: Record<string, unknown>): string | undefined {
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

export function prepareAftershipWebhookEvent(
  input: PrepareInput,
): AftershipRouteResult & { parsed?: AftershipParsedEvent } {
  if (!input.secret?.trim()) {
    return {
      status: 503,
      body: { error: "Webhook signing not configured", code: "WEBHOOK_DISABLED" },
    };
  }

  if (!Buffer.isBuffer(input.rawBody)) {
    return {
      status: 400,
      body: { error: "Invalid body", code: "INVALID_BODY" },
    };
  }

  if (!verifyAftershipHmac(input.rawBody, input.signatureHeader, input.secret)) {
    return {
      status: 401,
      body: { error: "Invalid signature", code: "INVALID_WEBHOOK_SIGNATURE" },
    };
  }

  let payload: TrackingEnvelope;
  try {
    payload = JSON.parse(input.rawBody.toString("utf8")) as TrackingEnvelope;
  } catch {
    return {
      status: 400,
      body: { error: "Invalid JSON", code: "INVALID_JSON" },
    };
  }

  const tracking = (payload.msg?.tracking ?? payload.tracking) as Record<string, unknown> | undefined;
  if (!tracking) {
    return { status: 200, body: { received: true, skipped: true } };
  }

  const orderId = pickMedusaOrderId(tracking);
  if (!orderId) {
    return { status: 200, body: { received: true, skipped: true } };
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
  const checkpoints = tracking.checkpoints as
    | Array<{ message?: string; checkpoint_time?: string }>
    | undefined;
  const lastCheckpoint =
    checkpoints && checkpoints.length > 0
      ? [
          checkpoints[checkpoints.length - 1]?.message,
          checkpoints[checkpoints.length - 1]?.checkpoint_time,
        ]
          .filter(Boolean)
          .join(" · ")
      : "";

  return {
    status: 200,
    body: { received: true },
    parsed: {
      orderId,
      tag,
      trackingId,
      dedupId: buildAftershipWebhookDedupId(orderId, tag),
      mappedStatus: mapAftershipTag(tag),
      lastCheckpoint,
    },
  };
}

export async function applyAftershipWebhookEvent(
  input: ApplyInput,
): Promise<AftershipRouteResult> {
  const {
    parsed,
    claimDedup,
    recordWebhookEvent,
    updateOrderMetadata,
    mergePaymentAttemptPayload,
    getCodCaptureState,
    captureCodPayment,
    enqueueCaptureRetry,
    markWebhookProcessed,
    nowIso,
    log,
  } = input;

  const isFirst = await claimDedup(parsed.dedupId);
  if (!isFirst) {
    log("deduped", { order_id: parsed.orderId, dedup_id: parsed.dedupId });
    return { status: 200, body: { received: true, duplicate: true } };
  }

  log("received", {
    order_id: parsed.orderId,
    tag: parsed.tag ?? null,
    tracking_id: parsed.trackingId ?? null,
  });

  const webhookRecord = await recordWebhookEvent({
    provider: "aftership",
    eventId: parsed.dedupId,
    eventType: parsed.tag ?? "unknown",
    payload: {
      order_id: parsed.orderId,
      tracking: parsed.trackingId,
      tag: parsed.tag,
    },
    payloadHash: null,
  });

  await updateOrderMetadata(parsed.orderId, {
    aftership_tag: parsed.tag ?? null,
    aftership_status: parsed.mappedStatus,
    aftership_last_checkpoint: parsed.lastCheckpoint || null,
    aftership_updated_at: nowIso(),
  });

  await mergePaymentAttemptPayload(parsed.orderId, {
    aftership_tag: parsed.tag ?? null,
    aftership_status: parsed.mappedStatus,
    aftership_tracking_id: parsed.trackingId ?? null,
    aftership_last_checkpoint: parsed.lastCheckpoint || null,
    ...(parsed.mappedStatus === "delivered"
      ? { aftership_delivered_at: nowIso() }
      : {}),
  });

  if (parsed.mappedStatus === "delivered") {
    log("delivered_processing", { order_id: parsed.orderId });
    try {
      const codCaptureState = await getCodCaptureState(parsed.orderId);
      if (codCaptureState?.paymentId) {
        if (codCaptureState.alreadyCaptured) {
          log("capture_skipped_already_captured", { order_id: parsed.orderId });
          if (webhookRecord.id) {
            await markWebhookProcessed(webhookRecord.id, true);
          }
          return {
            status: 200,
            body: { received: true, cod_capture: "already_captured" },
          };
        }

        await mergePaymentAttemptPayload(parsed.orderId, {
          cod_capture_started_at: nowIso(),
          cod_capture_source_pending: "aftership_webhook",
        });

        log("capture_started", {
          order_id: parsed.orderId,
          payment_id: codCaptureState.paymentId,
        });
        await captureCodPayment(codCaptureState.paymentId);
        log("capture_success", {
          order_id: parsed.orderId,
          payment_id: codCaptureState.paymentId,
        });
        await mergePaymentAttemptPayload(parsed.orderId, {
          cod_capture_complete: true,
          cod_capture_source: "aftership_webhook",
          cod_captured_at: nowIso(),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log("capture_failed", { order_id: parsed.orderId, error: message });
      await mergePaymentAttemptPayload(parsed.orderId, {
        cod_capture_last_error: message.slice(0, 500),
        cod_needs_review: true,
      });
      await enqueueCaptureRetry(parsed.orderId, message);
    }
  }

  if (webhookRecord.id) {
    await markWebhookProcessed(webhookRecord.id, true);
  }

  return { status: 200, body: { received: true } };
}
