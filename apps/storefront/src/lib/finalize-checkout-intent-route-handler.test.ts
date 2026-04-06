import assert from "node:assert/strict";
import test from "node:test";

import { handleFinalizeCheckoutIntentRequest } from "./finalize-checkout-intent-route-handler";

test("handleFinalizeCheckoutIntentRequest returns 429 from rate limit guard", async () => {
  const res = await handleFinalizeCheckoutIntentRequest(
    new Request("http://localhost/api/finalize", { method: "POST" }),
    "corr_1",
    {
      applyRateLimit: async () =>
        ({
          ok: false,
          response: new Response(JSON.stringify({ error: "Too many requests" }), {
            status: 429,
            headers: { "Content-Type": "application/json" },
          }),
        }) as const,
      readCartIdFromCookie: async () => "cart_1",
      getPaymentAttemptRow: async () => null,
      incrementFinalizeAttempts: async () => {},
      updatePaymentAttempt: async () => {},
      finalizeMedusaCart: async () => ({
        ok: true,
        orderId: "order_1",
        redirectUrl: "/track/order_1",
        attempts: 1,
      }),
      logEvent: () => {},
      nowIso: () => "2026-04-06T00:00:00.000Z",
    },
  );

  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { error: "Too many requests" });
});

test("handleFinalizeCheckoutIntentRequest returns order redirect on success", async () => {
  const patches: Array<Record<string, unknown>> = [];

  const res = await handleFinalizeCheckoutIntentRequest(
    new Request("http://localhost/api/finalize", { method: "POST" }),
    "corr_1",
    {
      applyRateLimit: async () => ({ ok: true }),
      readCartIdFromCookie: async () => "cart_1",
      getPaymentAttemptRow: async () => ({
        cart_id: "cart_1",
        correlation_id: "corr_1",
        provider: "stripe",
      }),
      incrementFinalizeAttempts: async () => {},
      updatePaymentAttempt: async (_id, patch) => {
        patches.push(patch);
      },
      finalizeMedusaCart: async () => ({
        ok: true,
        orderId: "order_1",
        redirectUrl: "/track/order_1?t=test",
        attempts: 2,
      }),
      logEvent: () => {},
      nowIso: () => "2026-04-06T00:00:00.000Z",
    },
  );

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    ok: true,
    orderId: "order_1",
    redirectUrl: "/track/order_1?t=test",
  });
  assert.equal(patches[0]?.status, "completed");
});

test("handleFinalizeCheckoutIntentRequest rejects cart mismatch through live handler wiring", async () => {
  const res = await handleFinalizeCheckoutIntentRequest(
    new Request("http://localhost/api/finalize", { method: "POST" }),
    "corr_1",
    {
      applyRateLimit: async () => ({ ok: true }),
      readCartIdFromCookie: async () => "cart_1",
      getPaymentAttemptRow: async () => ({
        cart_id: "cart_other",
        correlation_id: "corr_1",
        provider: "stripe",
      }),
      incrementFinalizeAttempts: async () => {},
      updatePaymentAttempt: async () => {},
      finalizeMedusaCart: async () => ({
        ok: true,
        orderId: "order_1",
        redirectUrl: "/track/order_1",
        attempts: 1,
      }),
      logEvent: () => {},
      nowIso: () => "2026-04-06T00:00:00.000Z",
    },
  );

  assert.equal(res.status, 403);
  assert.deepEqual(await res.json(), { error: "Cart mismatch" });
});
