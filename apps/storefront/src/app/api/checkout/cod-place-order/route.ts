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
 * Server-owned COD order placement: browser must not call Medusa `cart.complete` directly.
 */
export async function POST(req: Request) {
  const rl = await applyRateLimit(req, "cod-place-order", 30, 60_000);
  if (!rl.ok) {
    return rl.response;
  }

  const cartId = await readCartIdFromCookie();
  if (!cartId) {
    return NextResponse.json({ error: "No active cart" }, { status: 400 });
  }

  let correlationId = "";
  try {
    const body = (await req.json()) as { correlationId?: string };
    if (typeof body.correlationId === "string" && body.correlationId.trim()) {
      correlationId = body.correlationId.trim();
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!correlationId) {
    return NextResponse.json({ error: "correlationId is required" }, { status: 400 });
  }

  const sb = createStorefrontServiceSupabase();
  const row = sb ? await getPaymentAttemptByCorrelationId(sb, correlationId) : null;
  if (sb && row && row.cart_id !== cartId) {
    return NextResponse.json({ error: "Cart mismatch" }, { status: 403 });
  }
  if (sb && row && row.provider !== "cod") {
    return NextResponse.json({ error: "Not a COD attempt" }, { status: 400 });
  }

  if (sb && row) {
    try {
      await incrementFinalizeAttempts(sb, correlationId);
    } catch {
      await updatePaymentAttemptByCorrelationId(sb, correlationId, {
        status: "finalizing_order",
        checkout_state: "finalizing_order",
      }).catch(() => {});
    }
  }

  const result = await finalizeMedusaCartFromServer(cartId, { maxCompleteAttempts: 4 });

  if (!result.ok) {
    if (sb) {
      await updatePaymentAttemptByCorrelationId(sb, correlationId, {
        status: "paid_awaiting_order",
        checkout_state: "awaiting_completion",
        last_error: result.error.slice(0, 2000),
      }).catch(() => {});
    }
    logCheckoutCompletionEvent({
      stage: "cod_place_order",
      outcome: "failure",
      httpStatus: result.status,
      errorCode: "order_not_ready",
      message: result.error.slice(0, 500),
    });
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (sb) {
    await updatePaymentAttemptByCorrelationId(sb, correlationId, {
      status: "completed",
      checkout_state: "completed",
      medusa_order_id: result.orderId,
      order_id: result.orderId,
      last_error: null,
      finalized_at: new Date().toISOString(),
    }).catch(() => {});
  }

  logCheckoutCompletionEvent({
    stage: "cod_place_order",
    outcome: "success",
    httpStatus: 200,
    orderId: result.orderId,
  });

  return NextResponse.json({
    ok: true,
    orderId: result.orderId,
    redirectUrl: result.redirectUrl,
  });
}
