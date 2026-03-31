/**
 * AfterShip webhook dedup ID builder tests.
 * `.mts` keeps ESM so tsx does not emit `require()` for sibling `.ts` modules (Windows-safe).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { buildAftershipWebhookDedupId } from "./aftership-webhook-dedup.ts";

test("buildAftershipWebhookDedupId: stable ID for same order and tag", () => {
  const a = buildAftershipWebhookDedupId("order_123", "Delivered");
  const b = buildAftershipWebhookDedupId("order_123", "Delivered");
  assert.equal(a, b);
  assert.equal(a, "aftership:order_123:Delivered");
});

test("buildAftershipWebhookDedupId: different tags produce different IDs", () => {
  const a = buildAftershipWebhookDedupId("order_123", "InTransit");
  const b = buildAftershipWebhookDedupId("order_123", "Delivered");
  assert.notEqual(a, b);
});

test("buildAftershipWebhookDedupId: undefined tag produces unknown suffix", () => {
  const r = buildAftershipWebhookDedupId("order_123", undefined);
  assert.equal(r, "aftership:order_123:unknown");
});
