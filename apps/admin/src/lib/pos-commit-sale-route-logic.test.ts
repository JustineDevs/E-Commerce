import assert from "node:assert/strict";
import test from "node:test";

import { posCommitSaleRouteLogic } from "./pos-commit-sale-route-logic";

test("posCommitSaleRouteLogic replays completed idempotent sales", async () => {
  const result = await posCommitSaleRouteLogic({
    body: { items: [{ variantId: "variant_1", quantity: 1 }] },
    correlationId: "req_1",
    idempotencyKey: "idem_1",
    envReady: true,
    completedReplayOrderNumber: "1001",
    findExistingOrderByOfflineSaleId: async () => null,
    assertStock: async () => ({ ok: true }),
    loadShiftStatus: async () => "open",
    evaluatePolicy: () => ({ allowed: true, violations: [] }),
    createDraftOrder: async () => ({ id: "draft_1" }),
    convertDraftToOrder: async () => ({ id: "order_1", display_id: "1001", total: 5500 }),
    patchOrderMetadata: async () => {},
    rememberCompletedReplay: () => {},
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.orderNumber, "1001");
  assert.equal(result.body.idempotent, true);
});

test("posCommitSaleRouteLogic rejects missing items", async () => {
  const result = await posCommitSaleRouteLogic({
    body: { items: [] },
    correlationId: "req_1",
    envReady: true,
    completedReplayOrderNumber: null,
    findExistingOrderByOfflineSaleId: async () => null,
    assertStock: async () => ({ ok: true }),
    loadShiftStatus: async () => "open",
    evaluatePolicy: () => ({ allowed: true, violations: [] }),
    createDraftOrder: async () => ({ id: "draft_1" }),
    convertDraftToOrder: async () => ({ id: "order_1", display_id: "1001", total: 5500 }),
    patchOrderMetadata: async () => {},
    rememberCompletedReplay: () => {},
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.code, "BAD_REQUEST");
});

test("posCommitSaleRouteLogic enforces stock and policy denials", async () => {
  const stockDenied = await posCommitSaleRouteLogic({
    body: { items: [{ variantId: "variant_1", quantity: 2 }] },
    correlationId: "req_1",
    envReady: true,
    completedReplayOrderNumber: null,
    findExistingOrderByOfflineSaleId: async () => null,
    assertStock: async () => ({
      ok: false,
      message: "Insufficient stock",
      code: "INSUFFICIENT_STOCK",
    }),
    loadShiftStatus: async () => "open",
    evaluatePolicy: () => ({ allowed: true, violations: [] }),
    createDraftOrder: async () => ({ id: "draft_1" }),
    convertDraftToOrder: async () => ({ id: "order_1", display_id: "1001", total: 5500 }),
    patchOrderMetadata: async () => {},
    rememberCompletedReplay: () => {},
  });
  assert.equal(stockDenied.status, 409);

  const policyDenied = await posCommitSaleRouteLogic({
    body: { items: [{ variantId: "variant_1", quantity: 2 }], shiftId: "shift_1" },
    correlationId: "req_1",
    envReady: true,
    completedReplayOrderNumber: null,
    findExistingOrderByOfflineSaleId: async () => null,
    assertStock: async () => ({ ok: true }),
    loadShiftStatus: async () => "closed",
    evaluatePolicy: () => ({ allowed: false, violations: ["Shift must be open"] }),
    createDraftOrder: async () => ({ id: "draft_1" }),
    convertDraftToOrder: async () => ({ id: "order_1", display_id: "1001", total: 5500 }),
    patchOrderMetadata: async () => {},
    rememberCompletedReplay: () => {},
  });
  assert.equal(policyDenied.status, 403);
  assert.equal(policyDenied.body.code, "POS_POLICY_DENIED");
});

test("posCommitSaleRouteLogic returns existing order for offline replay", async () => {
  const result = await posCommitSaleRouteLogic({
    body: {
      items: [{ variantId: "variant_1", quantity: 1 }],
      offlineSaleId: "offline_1",
    },
    correlationId: "req_1",
    envReady: true,
    completedReplayOrderNumber: null,
    findExistingOrderByOfflineSaleId: async () => ({
      id: "order_1",
      displayId: "1001",
    }),
    assertStock: async () => ({ ok: true }),
    loadShiftStatus: async () => "open",
    evaluatePolicy: () => ({ allowed: true, violations: [] }),
    createDraftOrder: async () => ({ id: "draft_1" }),
    convertDraftToOrder: async () => ({ id: "order_1", display_id: "1001", total: 5500 }),
    patchOrderMetadata: async () => {},
    rememberCompletedReplay: () => {},
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.idempotent, true);
  assert.equal(result.body.orderNumber, "1001");
});

test("posCommitSaleRouteLogic creates order, patches metadata, and remembers idempotency", async () => {
  const patched: Array<Record<string, unknown>> = [];
  const remembered: Array<{ key: string; orderNumber: string }> = [];

  const result = await posCommitSaleRouteLogic({
    body: {
      items: [{ variantId: "variant_1", quantity: 2 }],
      email: "cashier@example.com",
      offlineSaleId: "offline_1",
      shiftId: "shift_1",
    },
    correlationId: "req_1",
    idempotencyKey: "idem_1",
    envReady: true,
    completedReplayOrderNumber: null,
    findExistingOrderByOfflineSaleId: async () => null,
    assertStock: async () => ({ ok: true }),
    loadShiftStatus: async () => "open",
    evaluatePolicy: () => ({ allowed: true, violations: [] }),
    createDraftOrder: async () => ({ id: "draft_1" }),
    convertDraftToOrder: async () => ({ id: "order_1", display_id: "1001", total: 5500 }),
    patchOrderMetadata: async (_orderId, metadata) => {
      patched.push(metadata);
    },
    rememberCompletedReplay: (key, orderNumber) => {
      remembered.push({ key, orderNumber });
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.orderNumber, "1001");
  assert.equal(result.body.orderId, "order_1");
  assert.deepEqual(patched[0], {
    pos_offline_id: "offline_1",
    pos_shift_id: "shift_1",
  });
  assert.deepEqual(remembered[0], { key: "idem_1", orderNumber: "1001" });
});

test("posCommitSaleRouteLogic fails when Medusa draft-order creation returns no id", async () => {
  const result = await posCommitSaleRouteLogic({
    body: { items: [{ variantId: "variant_1", quantity: 1 }] },
    correlationId: "req_1",
    envReady: true,
    completedReplayOrderNumber: null,
    findExistingOrderByOfflineSaleId: async () => null,
    assertStock: async () => ({ ok: true }),
    loadShiftStatus: async () => "open",
    evaluatePolicy: () => ({ allowed: true, violations: [] }),
    createDraftOrder: async () => ({}),
    convertDraftToOrder: async () => ({ id: "order_1", display_id: "1001", total: 5500 }),
    patchOrderMetadata: async () => {},
    rememberCompletedReplay: () => {},
  });

  assert.equal(result.status, 502);
  assert.equal(result.body.code, "MEDUSA_UNAVAILABLE");
});
