import { NextResponse } from "next/server";
import { buildTrackingUrl, DEFAULT_PUBLIC_SITE_ORIGIN } from "@apparel-commerce/sdk";

import { applyRateLimit, readCartIdFromCookie } from "@/lib/cart-api-helpers";
import { createStorefrontMedusaSdk } from "@/lib/medusa-sdk";

type CompleteResponse = {
  type?: string;
  order?: { id?: string };
  error?: { message?: string } | string;
};

/**
 * Finalizes the Medusa cart after Stripe Checkout (or other hosted) payment.
 * Retries from the client while the payment webhook propagates.
 */
export async function POST(req: Request) {
  const rl = await applyRateLimit(req, "complete-medusa-cart", 40, 60_000);
  if (!rl.ok) {
    return rl.response;
  }

  const cartId = await readCartIdFromCookie();
  if (!cartId) {
    return NextResponse.json({ error: "No active cart" }, { status: 400 });
  }

  try {
    const sdk = createStorefrontMedusaSdk();
    const storeCart = sdk.store.cart as unknown as {
      complete?: (id: string, body?: unknown) => Promise<CompleteResponse>;
    };
    if (typeof storeCart.complete !== "function") {
      return NextResponse.json(
        { error: "Cart completion is not available" },
        { status: 501 },
      );
    }

    const completed = await storeCart.complete(cartId, {});
    if (completed?.type !== "order" || !completed.order?.id) {
      const errMsg =
        typeof completed?.error === "string"
          ? completed.error
          : completed?.error &&
              typeof completed.error === "object" &&
              "message" in completed.error
            ? String((completed.error as { message?: string }).message)
            : "Order not ready";
      return NextResponse.json({ error: errMsg }, { status: 409 });
    }

    const orderId = completed.order.id;
    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_PUBLIC_SITE_ORIGIN;
    const redirectUrl = buildTrackingUrl(base, orderId);
    if (!redirectUrl) {
      return NextResponse.json(
        { error: "Tracking URL is not configured", orderId },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true, orderId, redirectUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Complete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
