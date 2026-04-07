import { NextResponse } from "next/server";
import { registerPaymentAttempt } from "@apparel-commerce/platform-data";

import { applyRateLimit, readCartIdFromCookie } from "@/lib/cart-api-helpers";
import { registerCheckoutIntentRouteLogic } from "@/lib/payment-attempt-route-logic";
import { createStorefrontServiceSupabase } from "@/lib/storefront-supabase";
import { logCommerceObservabilityServer } from "@/lib/commerce-observability";

export const dynamic = "force-dynamic";

type Body = {
  provider?: string;
  amountMinor?: number;
  currencyCode?: string;
  quoteFingerprint?: string;
  variantIds?: string[];
  productIds?: string[];
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
  const result = await registerCheckoutIntentRouteLogic({
    cartId,
    provider,
    amountMinor,
    currencyCode,
    quoteFingerprint:
      typeof body.quoteFingerprint === "string" ? body.quoteFingerprint.trim() : undefined,
    variantIds: Array.isArray(body.variantIds)
      ? body.variantIds.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0,
        )
      : undefined,
    productIds: Array.isArray(body.productIds)
      ? body.productIds.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0,
        )
      : undefined,
    medusaPaymentSessionId: body.medusaPaymentSessionId,
    providerSessionId: body.providerSessionId,
    idempotencyKey: body.idempotencyKey,
    supabaseAvailable: Boolean(sb),
    registerPaymentAttempt: async (input) => {
      if (!sb) {
        throw new Error("Payment ledger is not configured");
      }
      return registerPaymentAttempt(sb, input);
    },
  });

  if (result.status === 200 && result.body && typeof result.body === "object") {
    const b = result.body as { correlationId?: string; reused?: boolean };
    logCommerceObservabilityServer("payment_session_created", {
      correlationId: b.correlationId,
      cartId,
      provider,
      reused: b.reused === true,
      quoteFingerprint:
        typeof body.quoteFingerprint === "string" ? body.quoteFingerprint.trim() : null,
    });
  }

  return NextResponse.json(result.body, { status: result.status });
}
