import crypto from "node:crypto";

import {
  applyAftershipWebhookEvent,
  prepareAftershipWebhookEvent,
  verifyAftershipHmac,
} from "./route-logic";

describe("AfterShip webhook preparation", () => {
  const secret = "aftership-secret";

  function sign(body: string): string {
    return crypto.createHmac("sha256", secret).update(body).digest("base64");
  }

  it("rejects missing signing configuration", () => {
    const result = prepareAftershipWebhookEvent({
      secret: undefined,
      rawBody: Buffer.from("{}"),
      signatureHeader: "sig",
    });
    expect(result.status).toBe(503);
  });

  it("verifies valid HMAC signatures", () => {
    const body = Buffer.from('{"tracking":{"order_id":"order_1"}}');
    expect(verifyAftershipHmac(body, sign(body.toString("utf8")), secret)).toBe(true);
    expect(verifyAftershipHmac(body, "bad", secret)).toBe(false);
  });

  it("rejects malformed JSON and invalid signatures", () => {
    const body = Buffer.from("{not-json");
    const invalidSignature = prepareAftershipWebhookEvent({
      secret,
      rawBody: body,
      signatureHeader: "bad",
    });
    expect(invalidSignature.status).toBe(401);

    const malformed = prepareAftershipWebhookEvent({
      secret,
      rawBody: body,
      signatureHeader: sign(body.toString("utf8")),
    });
    expect(malformed.status).toBe(400);
  });

  it("skips payloads without tracking or order correlation", () => {
    const noTrackingBody = Buffer.from("{}");
    const noTracking = prepareAftershipWebhookEvent({
      secret,
      rawBody: noTrackingBody,
      signatureHeader: sign(noTrackingBody.toString("utf8")),
    });
    expect(noTracking.body).toEqual({ received: true, skipped: true });

    const noOrderBody = Buffer.from(
      JSON.stringify({ tracking: { tag: "Delivered", id: "trk_1" } }),
    );
    const noOrder = prepareAftershipWebhookEvent({
      secret,
      rawBody: noOrderBody,
      signatureHeader: sign(noOrderBody.toString("utf8")),
    });
    expect(noOrder.body).toEqual({ received: true, skipped: true });
  });
});

describe("AfterShip webhook mutation safety", () => {
  function parsedDelivered() {
    return {
      orderId: "order_1",
      tag: "Delivered",
      trackingId: "trk_1",
      dedupId: "aftership:order_1:Delivered",
      mappedStatus: "delivered",
      lastCheckpoint: "Delivered · 2026-04-05T00:00:00Z",
    };
  }

  it("returns duplicate without mutating state twice", async () => {
    const result = await applyAftershipWebhookEvent({
      parsed: parsedDelivered(),
      claimDedup: async () => false,
      recordWebhookEvent: async () => ({ inserted: false }),
      updateOrderMetadata: async () => {
        throw new Error("should not update");
      },
      mergePaymentAttemptPayload: async () => {
        throw new Error("should not merge");
      },
      getCodCaptureState: async () => null,
      captureCodPayment: async () => {},
      enqueueCaptureRetry: async () => {},
      markWebhookProcessed: async () => {},
      nowIso: () => "2026-04-05T00:00:00Z",
      log: () => {},
    });

    expect(result).toEqual({ status: 200, body: { received: true, duplicate: true } });
  });

  it("updates order metadata and marks webhook processed on non-COD shipment updates", async () => {
    const merged: Array<Record<string, unknown>> = [];
    let processed = false;

    const result = await applyAftershipWebhookEvent({
      parsed: {
        ...parsedDelivered(),
        mappedStatus: "shipped",
      },
      claimDedup: async () => true,
      recordWebhookEvent: async () => ({ inserted: true, id: "wh_1" }),
      updateOrderMetadata: async () => {},
      mergePaymentAttemptPayload: async (_orderId, merge) => {
        merged.push(merge);
      },
      getCodCaptureState: async () => null,
      captureCodPayment: async () => {},
      enqueueCaptureRetry: async () => {},
      markWebhookProcessed: async () => {
        processed = true;
      },
      nowIso: () => "2026-04-05T00:00:00Z",
      log: () => {},
    });

    expect(result).toEqual({ status: 200, body: { received: true } });
    expect(merged[0].aftership_status).toBe("shipped");
    expect(processed).toBe(true);
  });

  it("captures COD payment exactly once when delivered", async () => {
    const merged: Array<Record<string, unknown>> = [];
    const captured: string[] = [];

    const result = await applyAftershipWebhookEvent({
      parsed: parsedDelivered(),
      claimDedup: async () => true,
      recordWebhookEvent: async () => ({ inserted: true, id: "wh_1" }),
      updateOrderMetadata: async () => {},
      mergePaymentAttemptPayload: async (_orderId, merge) => {
        merged.push(merge);
      },
      getCodCaptureState: async () => ({ paymentId: "pay_1", alreadyCaptured: false }),
      captureCodPayment: async (paymentId) => {
        captured.push(paymentId);
      },
      enqueueCaptureRetry: async () => {},
      markWebhookProcessed: async () => {},
      nowIso: () => "2026-04-05T00:00:00Z",
      log: () => {},
    });

    expect(result).toEqual({ status: 200, body: { received: true } });
    expect(captured).toEqual(["pay_1"]);
    expect(merged.some((entry) => entry.cod_capture_complete === true)).toBe(true);
  });

  it("does not recapture already captured COD payments", async () => {
    let captureCalled = false;

    const result = await applyAftershipWebhookEvent({
      parsed: parsedDelivered(),
      claimDedup: async () => true,
      recordWebhookEvent: async () => ({ inserted: true, id: "wh_1" }),
      updateOrderMetadata: async () => {},
      mergePaymentAttemptPayload: async () => {},
      getCodCaptureState: async () => ({ paymentId: "pay_1", alreadyCaptured: true }),
      captureCodPayment: async () => {
        captureCalled = true;
      },
      enqueueCaptureRetry: async () => {},
      markWebhookProcessed: async () => {},
      nowIso: () => "2026-04-05T00:00:00Z",
      log: () => {},
    });

    expect(result).toEqual({
      status: 200,
      body: { received: true, cod_capture: "already_captured" },
    });
    expect(captureCalled).toBe(false);
  });

  it("marks needs review and enqueues retry when COD capture fails", async () => {
    const merged: Array<Record<string, unknown>> = [];
    const queued: Array<{ orderId: string; error: string }> = [];

    const result = await applyAftershipWebhookEvent({
      parsed: parsedDelivered(),
      claimDedup: async () => true,
      recordWebhookEvent: async () => ({ inserted: true, id: "wh_1" }),
      updateOrderMetadata: async () => {},
      mergePaymentAttemptPayload: async (_orderId, merge) => {
        merged.push(merge);
      },
      getCodCaptureState: async () => ({ paymentId: "pay_1", alreadyCaptured: false }),
      captureCodPayment: async () => {
        throw new Error("capture failed");
      },
      enqueueCaptureRetry: async (orderId, error) => {
        queued.push({ orderId, error });
      },
      markWebhookProcessed: async () => {},
      nowIso: () => "2026-04-05T00:00:00Z",
      log: () => {},
    });

    expect(result).toEqual({ status: 200, body: { received: true } });
    expect(merged.some((entry) => entry.cod_needs_review === true)).toBe(true);
    expect(queued).toEqual([{ orderId: "order_1", error: "capture failed" }]);
  });
});
