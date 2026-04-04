import { NextResponse } from "next/server";
import {
  listStuckPaymentAttempts,
  updatePaymentAttemptByCorrelationId,
} from "@apparel-commerce/platform-data";

import { finalizeMedusaCartFromServer } from "@/lib/finalize-medusa-cart-server";
import { createStorefrontServiceSupabase } from "@/lib/storefront-supabase";

export const dynamic = "force-dynamic";

/**
 * Server-side recovery for payment attempts stuck after hosted pay (webhook lag, closed tab).
 * Schedule: Vercel cron or external worker GET this route with shared secret.
 */
export async function GET(req: Request) {
  const secret = process.env.STOREFRONT_PAYMENT_CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  const token =
    auth?.startsWith("Bearer ") ? auth.slice(7).trim() : req.headers.get("x-cron-secret")?.trim();
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createStorefrontServiceSupabase();
  if (!sb) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  let processed = 0;
  let completed = 0;
  const errors: string[] = [];

  try {
    const stuck = await listStuckPaymentAttempts(sb, 25);
    for (const row of stuck) {
      processed += 1;
      const result = await finalizeMedusaCartFromServer(row.cart_id);
      if (result.ok) {
        completed += 1;
        await updatePaymentAttemptByCorrelationId(sb, row.correlation_id, {
          status: "completed",
          checkout_state: "completed",
          medusa_order_id: result.orderId,
          order_id: result.orderId,
          last_error: null,
          finalized_at: new Date().toISOString(),
        });
      } else {
        errors.push(`${row.correlation_id}: ${result.error}`);
        await updatePaymentAttemptByCorrelationId(sb, row.correlation_id, {
          last_error: result.error.slice(0, 2000),
        }).catch(() => {});
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, processed, completed, errors });
}
