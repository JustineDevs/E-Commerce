import { NextResponse } from "next/server";
import {
  getPaymentAttemptByCorrelationId,
  incrementFinalizeAttempts,
  updatePaymentAttemptByCorrelationId,
} from "@apparel-commerce/platform-data";

import { applyRateLimit, readCartIdFromCookie } from "@/lib/cart-api-helpers";
import { logCheckoutCompletionEvent } from "@/lib/checkout-telemetry";
import { finalizeMedusaCartFromServer } from "@/lib/finalize-medusa-cart-server";
import { codPlaceOrderRouteLogic } from "@/lib/payment-attempt-route-logic";
import { createStorefrontServiceSupabase } from "@/lib/storefront-supabase";

export const dynamic = "force-dynamic";

/**
 * Server-owned COD order placement: browser must not call Medusa `cart.complete` directly.
 */
export async function POST(req: Request) {
  const rl = await applyRateLimit(req, "cod-place-order", 30, 60_000);
  if (!rl.ok) {
    return rl.response;
  }

  const cartId = await readCartIdFromCookie();

  let correlationId = "";
  try {
    const body = (await req.json()) as { correlationId?: string };
    if (typeof body.correlationId === "string" && body.correlationId.trim()) {
      correlationId = body.correlationId.trim();
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sb = createStorefrontServiceSupabase();
  const row = sb ? await getPaymentAttemptByCorrelationId(sb, correlationId) : null;
  const result = await codPlaceOrderRouteLogic({
    correlationId,
    cartId,
    row,
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

  return NextResponse.json(result.body, { status: result.status });
}
