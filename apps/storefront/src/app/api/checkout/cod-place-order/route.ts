import { NextResponse } from "next/server";
import {
  getPaymentAttemptByCorrelationId,
  incrementFinalizeAttempts,
  updatePaymentAttemptByCorrelationId,
} from "@apparel-commerce/platform-data";

import { applyRateLimit, readCartIdFromCookie } from "@/lib/cart-api-helpers";
import { logCheckoutCompletionEvent } from "@/lib/checkout-telemetry";
import { handleCodPlaceOrderRequest } from "@/lib/cod-place-order-route-handler";
import { finalizeMedusaCartFromServer } from "@/lib/finalize-medusa-cart-server";
import { createStorefrontServiceSupabase } from "@/lib/storefront-supabase";

export const dynamic = "force-dynamic";

/**
 * Server-owned COD order placement: browser must not call Medusa `cart.complete` directly.
 */
export async function POST(req: Request) {
  const sb = createStorefrontServiceSupabase();
  return handleCodPlaceOrderRequest(req, {
    applyRateLimit: async (request) =>
      applyRateLimit(request, "cod-place-order", 30, 60_000),
    readCartIdFromCookie,
    getPaymentAttemptRow: async (id) =>
      sb ? getPaymentAttemptByCorrelationId(sb, id) : null,
    incrementFinalizeAttempts: async (id) => {
      if (!sb) {
        throw new Error("Payment ledger is not configured");
      }
      await incrementFinalizeAttempts(sb, id);
    },
    updatePaymentAttempt: async (id, patch) => {
      if (!sb) {
        return;
      }
      await updatePaymentAttemptByCorrelationId(sb, id, patch).catch(() => {});
    },
    finalizeMedusaCart: async (activeCartId) =>
      finalizeMedusaCartFromServer(activeCartId, { maxCompleteAttempts: 4 }),
    logEvent: (payload) =>
      logCheckoutCompletionEvent(payload as Parameters<typeof logCheckoutCompletionEvent>[0]),
    nowIso: () => new Date().toISOString(),
  });
}
