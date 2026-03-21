/**
 * Paymongo webhook dedup ID builder tests.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { buildPaymongoWebhookDedupId } from "./paymongo-webhook-dedup.js";

test("buildPaymongoWebhookDedupId: stable ID for same event", () => {
  const body = {
    data: { id: "evt_123", attributes: { type: "link.payment.paid" } },
  };
  const a = buildPaymongoWebhookDedupId(body as Record<string, unknown>);
  const b = buildPaymongoWebhookDedupId(body as Record<string, unknown>);
  assert.equal(a, b);
  assert.equal(a, "paymongo:link.payment.paid:evt_123");
});

test("buildPaymongoWebhookDedupId: different event IDs produce different dedup IDs", () => {
  const a = buildPaymongoWebhookDedupId({
    data: { id: "evt_1", attributes: { type: "link.payment.paid" } },
  } as Record<string, unknown>);
  const b = buildPaymongoWebhookDedupId({
    data: { id: "evt_2", attributes: { type: "link.payment.paid" } },
  } as Record<string, unknown>);
  assert.notEqual(a, b);
});

test("buildPaymongoWebhookDedupId: returns null when data.id missing", () => {
  const r = buildPaymongoWebhookDedupId({
    data: { attributes: { type: "link.payment.paid" } },
  } as Record<string, unknown>);
  assert.equal(r, null);
});
