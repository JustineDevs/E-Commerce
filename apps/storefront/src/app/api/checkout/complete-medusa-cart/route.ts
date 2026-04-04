import { NextResponse } from "next/server";
import {
  getPaymentAttemptByCorrelationId,
  updatePaymentAttemptByCorrelationId,
} from "@apparel-commerce/platform-data";

import { applyRateLimit, readCartIdFromCookie } from "@/lib/cart-api-helpers";
import { logCheckoutCompletionEvent } from "@/lib/checkout-telemetry";
import { finalizeMedusaCartFromServer } from "@/lib/finalize-medusa-cart-server";
import { createStorefrontServiceSupabase } from "@/lib/storefront-supabase";

/**
 * Legacy cart completion (cookie-bound). Prefer POST …/payments/checkout-intents/:id/finalize when a ledger row exists.
 */
export async function POST(req: Request) {
  const rl = await applyRateLimit(req, "complete-medusa-cart", 40, 60_000);
  if (!rl.ok) {
    return rl.response;
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

  let correlationId: string | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      correlationId?: string;
    };
    if (typeof body.correlationId === "string" && body.correlationId.trim()) {
      correlationId = body.correlationId.trim();
    }
  } catch {
    correlationId = undefined;
  }

  const sb = createStorefrontServiceSupabase();

  try {
    const result = await finalizeMedusaCartFromServer(cartId);

    if (!result.ok) {
      logCheckoutCompletionEvent({
        stage: "complete_medusa_cart",
        outcome: "failure",
        httpStatus: result.status,
        cartIdSuffix: cartSuffix,
        attempts: result.attempts,
        errorCode:
          result.status === 409 ? "order_not_ready" : "complete_failed",
        message: result.error.slice(0, 500),
      });
      if (sb && correlationId) {
        const row = await getPaymentAttemptByCorrelationId(sb, correlationId);
        if (row && row.cart_id === cartId) {
          await updatePaymentAttemptByCorrelationId(sb, correlationId, {
            status: "paid_awaiting_order",
            checkout_state: "awaiting_completion",
            last_error: result.error.slice(0, 2000),
          }).catch(() => {});
        }
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (sb && correlationId) {
      const row = await getPaymentAttemptByCorrelationId(sb, correlationId);
      if (row && row.cart_id === cartId) {
        await updatePaymentAttemptByCorrelationId(sb, correlationId, {
          status: "completed",
          checkout_state: "completed",
          medusa_order_id: result.orderId,
          order_id: result.orderId,
          last_error: null,
          finalized_at: new Date().toISOString(),
        }).catch(() => {});
      }
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
