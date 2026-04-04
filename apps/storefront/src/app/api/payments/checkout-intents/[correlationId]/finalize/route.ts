import { NextResponse } from "next/server";
import {
  getPaymentAttemptByCorrelationId,
  incrementFinalizeAttempts,
  updatePaymentAttemptByCorrelationId,
} from "@apparel-commerce/platform-data";

import { applyRateLimit, readCartIdFromCookie } from "@/lib/cart-api-helpers";
import { logCheckoutCompletionEvent } from "@/lib/checkout-telemetry";
import { finalizeMedusaCartFromServer } from "@/lib/finalize-medusa-cart-server";
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
  if (!correlationId?.trim()) {
    return NextResponse.json({ error: "Missing correlation id" }, { status: 400 });
  }

  const cartId = await readCartIdFromCookie();
  if (!cartId) {
    logCheckoutCompletionEvent({
      stage: "complete_medusa_cart",
      outcome: "failure",
      httpStatus: 400,
      errorCode: "no_cart",
      message: "No active cart",
    });
    return NextResponse.json({ error: "No active cart" }, { status: 400 });
  }

  const cartSuffix = cartId.length > 8 ? cartId.slice(-8) : cartId;
  const sb = createStorefrontServiceSupabase();

  const row = sb
    ? await getPaymentAttemptByCorrelationId(sb, correlationId.trim())
    : null;
  if (row && row.cart_id !== cartId) {
    return NextResponse.json({ error: "Cart mismatch" }, { status: 403 });
  }

  if (sb && row) {
    try {
      await incrementFinalizeAttempts(sb, correlationId.trim());
    } catch {
      await updatePaymentAttemptByCorrelationId(sb, correlationId.trim(), {
        status: "finalizing_order",
        checkout_state: "finalizing_order",
      });
    }
  }

  try {
    const result = await finalizeMedusaCartFromServer(cartId, {
      maxCompleteAttempts: 2,
    });

    if (!result.ok) {
      if (sb) {
        await updatePaymentAttemptByCorrelationId(sb, correlationId.trim(), {
          status: "paid_awaiting_order",
          checkout_state: "awaiting_completion",
          last_error: result.error.slice(0, 2000),
        });
      }
      logCheckoutCompletionEvent({
        stage: "complete_medusa_cart",
        outcome: "failure",
        httpStatus: result.status,
        cartIdSuffix: cartSuffix,
        attempts: result.attempts,
        errorCode: "order_not_ready",
        message: result.error.slice(0, 500),
      });
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    if (sb) {
      await updatePaymentAttemptByCorrelationId(sb, correlationId.trim(), {
        status: "completed",
        checkout_state: "completed",
        medusa_order_id: result.orderId,
        order_id: result.orderId,
        last_error: null,
        finalized_at: new Date().toISOString(),
      });
    }

    logCheckoutCompletionEvent({
      stage: "complete_medusa_cart",
      outcome: "success",
      httpStatus: 200,
      cartIdSuffix: cartSuffix,
      orderId: result.orderId,
      attempts: result.attempts,
    });

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      redirectUrl: result.redirectUrl,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Complete failed";
    if (sb) {
      await updatePaymentAttemptByCorrelationId(sb, correlationId.trim(), {
        last_error: msg.slice(0, 2000),
        status: "needs_review",
        checkout_state: "needs_review",
      }).catch(() => {});
    }
    logCheckoutCompletionEvent({
      stage: "complete_medusa_cart",
      outcome: "failure",
      httpStatus: 500,
      cartIdSuffix: cartSuffix,
      errorCode: "exception",
      message: msg.slice(0, 500),
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
