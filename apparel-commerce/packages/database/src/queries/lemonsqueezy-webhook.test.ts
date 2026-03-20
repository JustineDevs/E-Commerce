import assert from "node:assert/strict";
import test from "node:test";
import { parseLemonOrderPaidWebhook } from "./lemonsqueezy-webhook";

const basePaid = {
  meta: { event_name: "order_created" as const },
  data: {
    id: "ls-order-1",
    attributes: { status: "paid" },
  },
};

test("parseLemonOrderPaidWebhook reads order_id from meta.custom_data", () => {
  const payload = {
    ...basePaid,
    meta: { ...basePaid.meta, custom_data: { order_id: "550e8400-e29b-41d4-a716-446655440000" } },
  };
  const out = parseLemonOrderPaidWebhook(payload as Record<string, unknown>);
  assert.equal(out?.orderId, "550e8400-e29b-41d4-a716-446655440000");
  assert.equal(out?.lemonsqueezyOrderId, "ls-order-1");
});

test("parseLemonOrderPaidWebhook reads order_id from checkout_data.custom", () => {
  const payload = {
    meta: { event_name: "order_created" },
    data: {
      id: "ls-order-2",
      attributes: {
        status: "paid",
        checkout_data: { custom: { order_id: "660e8400-e29b-41d4-a716-446655440001" } },
      },
    },
  };
  const out = parseLemonOrderPaidWebhook(payload as Record<string, unknown>);
  assert.equal(out?.orderId, "660e8400-e29b-41d4-a716-446655440001");
  assert.equal(out?.lemonsqueezyOrderId, "ls-order-2");
});

test("parseLemonOrderPaidWebhook returns null for wrong event", () => {
  const payload = {
    meta: { event_name: "order_updated", custom_data: { order_id: "x" } },
    data: { id: "1", attributes: { status: "paid" } },
  };
  assert.equal(parseLemonOrderPaidWebhook(payload as Record<string, unknown>), null);
});

test("parseLemonOrderPaidWebhook returns null when status not paid", () => {
  const payload = {
    meta: { event_name: "order_created", custom_data: { order_id: "x" } },
    data: { id: "1", attributes: { status: "pending" } },
  };
  assert.equal(parseLemonOrderPaidWebhook(payload as Record<string, unknown>), null);
});

test("parseLemonOrderPaidWebhook returns null when order_id missing", () => {
  const payload = {
    meta: { event_name: "order_created" },
    data: { id: "1", attributes: { status: "paid" } },
  };
  assert.equal(parseLemonOrderPaidWebhook(payload as Record<string, unknown>), null);
});
