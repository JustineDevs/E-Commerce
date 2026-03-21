/**
 * Webhook idempotency: Lemon dedup id stability.
 * Same payload must produce the same dedup id for duplicate deliveries.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { buildLemonWebhookDedupId } from "./lemon-webhook-dedup.js";

test("buildLemonWebhookDedupId: same payload produces same id", () => {
  const payload = {
    meta: { event_name: "order_created" },
    data: { id: "ls-order-123" },
  };
  const a = buildLemonWebhookDedupId(payload as Record<string, unknown>);
  const b = buildLemonWebhookDedupId(payload as Record<string, unknown>);
  assert.equal(a, b);
  assert.equal(a, "lemon:order_created:ls-order-123");
});

test("buildLemonWebhookDedupId: different order ids produce different ids", () => {
  const id1 = buildLemonWebhookDedupId({
    meta: { event_name: "order_created" },
    data: { id: "ls-1" },
  } as Record<string, unknown>);
  const id2 = buildLemonWebhookDedupId({
    meta: { event_name: "order_created" },
    data: { id: "ls-2" },
  } as Record<string, unknown>);
  assert.notEqual(id1, id2);
});

test("buildLemonWebhookDedupId: missing data.id returns null", () => {
  const id = buildLemonWebhookDedupId({
    meta: { event_name: "order_created" },
    data: {},
  } as Record<string, unknown>);
  assert.equal(id, null);
});
