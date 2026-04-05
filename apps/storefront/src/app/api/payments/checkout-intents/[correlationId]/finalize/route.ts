import { NextResponse } from "next/server";
import {
  getPaymentAttemptByCorrelationId,
  incrementFinalizeAttempts,
  updatePaymentAttemptByCorrelationId,
} from "@apparel-commerce/platform-data";

import { applyRateLimit, readCartIdFromCookie } from "@/lib/cart-api-helpers";
import { logCheckoutCompletionEvent } from "@/lib/checkout-telemetry";
import { finalizeMedusaCartFromServer } from "@/lib/finalize-medusa-cart-server";
import { finalizeCheckoutIntentRouteLogic } from "@/lib/payment-attempt-route-logic";
import { createStorefrontServiceSupabase } from "@/lib/storefront-supabase";

export const dynamic = "force-dynamic";

/**
 * Server-owned order finalization after hosted payment. Browser should call this instead of
 * owning the retry loop; the return page polls GET checkout-intents until completed.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ correlationId: string }> },
) {
  const rl = await applyRateLimit(req, "checkout-intents-finalize", 40, 60_000);
  if (!rl.ok) {
    return rl.response;
  }

  const { correlationId } = await ctx.params;
  const cartId = await readCartIdFromCookie();
  const sb = createStorefrontServiceSupabase();
  const row = sb && correlationId?.trim()
    ? await getPaymentAttemptByCorrelationId(sb, correlationId.trim())
    : null;

  const result = await finalizeCheckoutIntentRouteLogic({
    correlationId: correlationId ?? "",
    cartId,
    row,
    incrementFinalizeAttempts: async (id) => {
      if (!sb) {
        throw new Error("Payment ledger is not configured");
      }
      return incrementFinalizeAttempts(sb, id);
    },
    updatePaymentAttempt: async (id, patch) => {
      if (!sb) {
        return;
      }
      await updatePaymentAttemptByCorrelationId(sb, id, patch);
    },
    finalizeMedusaCart: async (activeCartId) =>
      finalizeMedusaCartFromServer(activeCartId, { maxCompleteAttempts: 2 }),
    logEvent: (payload) =>
      logCheckoutCompletionEvent(payload as Parameters<typeof logCheckoutCompletionEvent>[0]),
    nowIso: () => new Date().toISOString(),
  });

  return NextResponse.json(result.body, { status: result.status });
}
