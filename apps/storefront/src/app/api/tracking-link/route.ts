import { NextResponse } from "next/server";
import {
  buildTrackingUrl,
  DEFAULT_PUBLIC_SITE_ORIGIN,
} from "@apparel-commerce/sdk";

import {
  getRequestIp,
  rateLimitFixedWindow,
} from "@/lib/storefront-api-rate-limit";
import { trackingLinkRouteLogic } from "@/lib/tracking-link-route-logic";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = await rateLimitFixedWindow(`tracking-link:${ip}`, MAX_PER_WINDOW, WINDOW_MS);

  let body: { cartId?: string };
  try {
    body = (await req.json()) as { cartId?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_PUBLIC_SITE_ORIGIN;
  const result = trackingLinkRouteLogic({
    cartId: typeof body?.cartId === "string" ? body.cartId : "",
    rateLimited: !rl.ok,
    retryAfterSec: !rl.ok ? rl.retryAfterSec : undefined,
    buildTrackingUrl: (cartId) => buildTrackingUrl(base, cartId),
  });

  return NextResponse.json(result.body, {
    status: result.status,
    ...(result.status === 429 && typeof result.body.retryAfter === "number"
      ? { headers: { "Retry-After": String(result.body.retryAfter) } }
      : {}),
  });
}
