import { NextResponse } from "next/server";
import {
  getPaymentAttemptByCorrelationId,
  updatePaymentAttemptByCorrelationId,
} from "@apparel-commerce/platform-data";

import { finalizeMedusaCartFromServer } from "@/lib/finalize-medusa-cart-server";
import { createStorefrontServiceSupabase } from "@/lib/storefront-supabase";

export const dynamic = "force-dynamic";

/**
 * Server-to-server: staff or worker retries finalization for a ledger row (no browser cookie).
 * Protect with `STOREFRONT_INTERNAL_RECONCILE_SECRET` (same value as admin `STOREFRONT_INTERNAL_RECONCILE_SECRET`).
 */
export async function POST(req: Request) {
  const secret = process.env.STOREFRONT_INTERNAL_RECONCILE_SECRET?.trim();
  const header = req.headers.get("x-internal-secret")?.trim();
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "correlationId required" }, { status: 400 });
  }

  const sb = createStorefrontServiceSupabase();
  if (!sb) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const row = await getPaymentAttemptByCorrelationId(sb, correlationId);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await finalizeMedusaCartFromServer(row.cart_id, {
    maxCompleteAttempts: 12,
  });

  if (!result.ok) {
    await updatePaymentAttemptByCorrelationId(sb, correlationId, {
      status: "paid_awaiting_order",
      checkout_state: "awaiting_completion",
      last_error: result.error.slice(0, 2000),
    }).catch(() => {});
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  await updatePaymentAttemptByCorrelationId(sb, correlationId, {
    status: "completed",
    checkout_state: "completed",
    medusa_order_id: result.orderId,
    order_id: result.orderId,
    last_error: null,
    finalized_at: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    orderId: result.orderId,
    redirectUrl: result.redirectUrl,
  });
}
