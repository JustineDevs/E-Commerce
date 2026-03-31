import { NextResponse } from "next/server";

import { getMedusaPublishableKey, getMedusaRegionId } from "@/lib/storefront-medusa-env";
import {
  applyRateLimit,
  readCartIdFromCookie,
  isValidCartId,
  retrieveCartLines,
} from "@/lib/cart-api-helpers";

export async function GET(req: Request) {
  const rl = await applyRateLimit(req, "cart-resume", 90, 60_000);
  if (!rl.ok) return rl.response;

  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("cartId")?.trim();
  const fromCookie = await readCartIdFromCookie();
  const cartId =
    fromQuery && isValidCartId(fromQuery)
      ? fromQuery
      : fromCookie && isValidCartId(fromCookie)
        ? fromCookie
        : "";

  if (!cartId) {
    return NextResponse.json({ lines: [], cartId: null as string | null });
  }

  if (!getMedusaPublishableKey()?.trim() || !getMedusaRegionId()?.trim()) {
    return NextResponse.json({ lines: [], cartId, skipped: true });
  }

  const lines = await retrieveCartLines(cartId);
  if (lines === null) {
    return NextResponse.json({ lines: [], cartId, error: "unavailable" });
  }

  return NextResponse.json({ lines, cartId });
}
