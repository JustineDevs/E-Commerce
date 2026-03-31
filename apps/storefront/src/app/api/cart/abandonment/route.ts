import { sendCartRecoveryEmail } from "@/lib/cart-recovery-email";
import { createStorefrontServiceSupabase } from "@/lib/storefront-supabase";
import { applyRateLimit, parseJsonBody } from "@/lib/cart-api-helpers";

const WINDOW_MS = 3_600_000;
const MAX_PER_WINDOW = 80;

type LinePayload = { variantId?: string; quantity?: number; price?: number };

export async function POST(req: Request) {
  const rl = await applyRateLimit(req, "cart-abandon", MAX_PER_WINDOW, WINDOW_MS);
  if (!rl.ok) return rl.response;

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (body === null || typeof body !== "object") {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const rawEmail =
    typeof o.email === "string" ? o.email.trim().slice(0, 320) : "";
  const email = rawEmail ? rawEmail.toLowerCase() : null;
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

  const sb = createStorefrontServiceSupabase();
  if (!sb) {
    return Response.json({ ok: false, skipped: true });
  }
  const { data: inserted, error } = await sb
    .from("cart_abandonment_events")
    .insert({
      email: email || null,
      line_count: lineCount,
      subtotal_cents: subtotalCents,
      path,
      referrer,
      client_timestamp: clientTimestamp,
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    return Response.json({ error: "Unable to record" }, { status: 500 });
  }

  const rowId = String(inserted.id);
  const em = email ?? "";
  if (
    em &&
    lineCount > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)
  ) {
    const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { count: priorSent, error: countErr } = await sb
      .from("cart_abandonment_events")
      .select("id", { count: "exact", head: true })
      .eq("email", em)
      .not("recovery_email_sent_at", "is", null)
      .gte("created_at", since);
    const n = countErr ? 99 : priorSent ?? 0;
    if (n < 2) {
      const sent = await sendCartRecoveryEmail({ to: em, lineCount });
      if (sent) {
        await sb
          .from("cart_abandonment_events")
          .update({ recovery_email_sent_at: new Date().toISOString() })
          .eq("id", rowId);
      }
    }
  }

  return Response.json({ ok: true });
}
