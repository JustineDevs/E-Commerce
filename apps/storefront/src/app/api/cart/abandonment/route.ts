import { createClient } from "@supabase/supabase-js";

import {
  getRequestIp,
  rateLimitFixedWindow,
} from "@/lib/storefront-api-rate-limit";

const WINDOW_MS = 3_600_000;
const MAX_PER_WINDOW = 80;

function serviceSupabase() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

type LinePayload = { variantId?: string; quantity?: number; price?: number };

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = rateLimitFixedWindow(`cart-abandon:${ip}`, MAX_PER_WINDOW, WINDOW_MS);
  if (!rl.ok) {
    return Response.json(
      { error: "Too many requests", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body === null || typeof body !== "object") {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const email =
    typeof o.email === "string" ? o.email.trim().slice(0, 320) : null;
  const path = typeof o.path === "string" ? o.path.slice(0, 2000) : null;
  const referrer =
    typeof o.referrer === "string" ? o.referrer.slice(0, 2000) : null;
  const clientTimestamp =
    typeof o.clientTimestamp === "string"
      ? o.clientTimestamp.slice(0, 80)
      : null;
  const lines = Array.isArray(o.lines) ? o.lines : [];
  let lineCount = 0;
  let subtotalCents: number | null = null;
  if (lines.length > 0) {
    lineCount = lines.length;
    let sum = 0;
    for (const raw of lines) {
      if (!raw || typeof raw !== "object") continue;
      const line = raw as LinePayload;
      const q =
        typeof line.quantity === "number" && Number.isFinite(line.quantity)
          ? Math.max(0, Math.floor(line.quantity))
          : 0;
      const p =
        typeof line.price === "number" && Number.isFinite(line.price)
          ? line.price
          : 0;
      sum += Math.round(p * q * 100);
    }
    subtotalCents = sum;
  }

  const sb = serviceSupabase();
  if (!sb) {
    return Response.json({ ok: false, skipped: true });
  }
  const { error } = await sb.from("cart_abandonment_events").insert({
    email: email || null,
    line_count: lineCount,
    subtotal_cents: subtotalCents,
    path,
    referrer,
    client_timestamp: clientTimestamp,
  });
  if (error) {
    return Response.json({ error: "Unable to record" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
