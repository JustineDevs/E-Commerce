/**
 * Lemon webhook dedup fail-closed behavior test.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { buildLemonWebhookDedupId } from "./lemon-webhook-dedup.js";

test("buildLemonWebhookDedupId: stable ID for same payload", () => {
  const body = {
    meta: { event_name: "order_created" },
    data: { id: "ls-order-100" },
  };
  const a = buildLemonWebhookDedupId(body as Record<string, unknown>);
  const b = buildLemonWebhookDedupId(body as Record<string, unknown>);
  assert.equal(a, b);
  assert.equal(a, "lemon:order_created:ls-order-100");
});

test("buildLemonWebhookDedupId: different data IDs produce different dedup IDs", () => {
  const a = buildLemonWebhookDedupId({
    meta: { event_name: "order_created" },
    data: { id: "ls-1" },
  } as Record<string, unknown>);
  const b = buildLemonWebhookDedupId({
    meta: { event_name: "order_created" },
    data: { id: "ls-2" },
  } as Record<string, unknown>);
  assert.notEqual(a, b);
});

test("buildLemonWebhookDedupId: returns null when data.id is missing", () => {
  const r = buildLemonWebhookDedupId({
    meta: { event_name: "order_created" },
    data: {},
  } as Record<string, unknown>);
  assert.equal(r, null);
});
