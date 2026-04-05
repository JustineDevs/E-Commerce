import { NextResponse } from "next/server";
import {
  listStuckPaymentAttempts,
  updatePaymentAttemptByCorrelationId,
} from "@apparel-commerce/platform-data";

import { finalizeMedusaCartFromServer } from "@/lib/finalize-medusa-cart-server";
import { finalizePaymentAttemptsCronRouteLogic } from "@/lib/payment-attempt-route-logic";
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

  const sb = createStorefrontServiceSupabase();
  try {
    const stuck = sb ? await listStuckPaymentAttempts(sb, 25) : [];
    const result = await finalizePaymentAttemptsCronRouteLogic({
      configuredSecret: secret ?? "",
      providedSecret: token ?? "",
      supabaseAvailable: Boolean(sb),
      stuckRows: stuck,
      finalizeMedusaCart: async (cartId) =>
        finalizeMedusaCartFromServer(cartId, { maxCompleteAttempts: 12 }),
      updatePaymentAttempt: async (id, patch) => {
        if (!sb) {
          return;
        }
        await updatePaymentAttemptByCorrelationId(sb, id, patch).catch(() => {});
      },
      nowIso: () => new Date().toISOString(),
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
