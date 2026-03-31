import { NextResponse } from "next/server";
import {
  buildTrackingUrl,
  DEFAULT_PUBLIC_SITE_ORIGIN,
} from "@apparel-commerce/sdk";

import {
  getRequestIp,
  rateLimitFixedWindow,
} from "@/lib/storefront-api-rate-limit";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = await rateLimitFixedWindow(`tracking-link:${ip}`, MAX_PER_WINDOW, WINDOW_MS);
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
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const cartId = typeof body?.cartId === "string" ? body.cartId.trim() : "";
  if (!cartId || (!cartId.startsWith("cart_") && !cartId.startsWith("order_"))) {
    return NextResponse.json(
      { error: "cartId required (cart_xxx or order_xxx)" },
      { status: 400 },
    );
  }

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_PUBLIC_SITE_ORIGIN;
  const url = buildTrackingUrl(base, cartId);

  if (!url) {
    return NextResponse.json(
      { error: "Tracking links require TRACKING_HMAC_SECRET (not configured)" },
      { status: 503 },
    );
  }

  return NextResponse.json({ trackingPageUrl: url });
}
