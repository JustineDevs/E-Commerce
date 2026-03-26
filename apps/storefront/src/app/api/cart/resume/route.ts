import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { MEDUSA_CART_COOKIE } from "@/lib/cart-cookie";
import { createStorefrontMedusaSdk } from "@/lib/medusa-sdk";
import { medusaCartToCartLines } from "@/lib/medusa-cart-to-lines";
import { getMedusaPublishableKey, getMedusaRegionId } from "@/lib/storefront-medusa-env";
import {
  getRequestIp,
  rateLimitFixedWindow,
} from "@/lib/storefront-api-rate-limit";

export async function GET(req: Request) {
  const ip = getRequestIp(req);
  const rl = rateLimitFixedWindow(`cart-resume:${ip}`, 90, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { lines: [], error: "rate_limited", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("cartId")?.trim();
  const jar = await cookies();
  const fromCookie = jar.get(MEDUSA_CART_COOKIE)?.value?.trim();
  const cartId =
    fromQuery && fromQuery.startsWith("cart_")
      ? fromQuery
      : fromCookie && fromCookie.startsWith("cart_")
        ? fromCookie
        : "";

  if (!cartId) {
    return NextResponse.json({ lines: [], cartId: null as string | null });
  }

  if (!getMedusaPublishableKey()?.trim() || !getMedusaRegionId()?.trim()) {
    return NextResponse.json({ lines: [], cartId, skipped: true });
  }

  try {
    const sdk = createStorefrontMedusaSdk();
    const { cart } = await sdk.store.cart.retrieve(cartId, {
      fields:
        "*items,*items.unit_price,*items.quantity,*items.variant,*items.variant.product,*items.variant.options,*items.product",
    } as never);
    const lines = medusaCartToCartLines(cart);
    return NextResponse.json({ lines, cartId });
  } catch {
    return NextResponse.json({
      lines: [],
      cartId,
      error: "unavailable",
    });
  }
}
