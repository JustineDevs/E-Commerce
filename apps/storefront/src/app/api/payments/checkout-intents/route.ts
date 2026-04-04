import { NextResponse } from "next/server";
import { registerPaymentAttempt } from "@apparel-commerce/platform-data";

import { applyRateLimit, readCartIdFromCookie } from "@/lib/cart-api-helpers";
import { createStorefrontServiceSupabase } from "@/lib/storefront-supabase";

export const dynamic = "force-dynamic";

type Body = {
  provider?: string;
  amountMinor?: number;
  currencyCode?: string;
  medusaPaymentSessionId?: string;
  providerSessionId?: string;
  idempotencyKey?: string;
};

/**
 * Registers a durable payment/checkout attempt (ledger row) before redirecting to a hosted PSP.
 */
export async function POST(req: Request) {
  const rl = await applyRateLimit(req, "checkout-intents", 60, 60_000);
  if (!rl.ok) {
    return rl.response;
  }

  const cartId = await readCartIdFromCookie();
  if (!cartId) {
    return NextResponse.json({ error: "No active cart" }, { status: 400 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const provider = typeof body.provider === "string" ? body.provider.trim().toLowerCase() : "";
  if (!provider) {
    return NextResponse.json({ error: "provider is required" }, { status: 400 });
  }

  const amountMinor =
    typeof body.amountMinor === "number" && Number.isFinite(body.amountMinor)
      ? Math.max(0, Math.floor(body.amountMinor))
      : 0;
  const currencyCode =
    typeof body.currencyCode === "string" && body.currencyCode.trim()
      ? body.currencyCode.trim()
      : "PHP";

  const sb = createStorefrontServiceSupabase();
  if (!sb) {
    return NextResponse.json(
      { error: "Payment ledger is not configured" },
      { status: 503 },
    );
  }

  try {
    const { correlationId, reused } = await registerPaymentAttempt(sb, {
      cartId,
      provider,
      amountMinor,
      currencyCode,
      medusaPaymentSessionId: body.medusaPaymentSessionId,
      providerSessionId: body.providerSessionId,
      idempotencyKey: body.idempotencyKey,
    });
    return NextResponse.json({
      correlationId,
      cartId,
      reused,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Register failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
