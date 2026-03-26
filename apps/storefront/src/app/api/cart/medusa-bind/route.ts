import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { MEDUSA_CART_COOKIE } from "@/lib/cart-cookie";
import {
  getRequestIp,
  rateLimitFixedWindow,
} from "@/lib/storefront-api-rate-limit";

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = rateLimitFixedWindow(`cart-bind:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: { cartId?: string };
  try {
    body = (await req.json()) as { cartId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cartId = typeof body.cartId === "string" ? body.cartId.trim() : "";
  if (!cartId.startsWith("cart_")) {
    return NextResponse.json({ error: "cartId required" }, { status: 400 });
  }

  const jar = await cookies();
  jar.set(MEDUSA_CART_COOKIE, cartId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}
