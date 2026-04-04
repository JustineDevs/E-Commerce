import { NextResponse } from "next/server";

import { requireStaffApiSession } from "@/lib/requireStaffSession";
import { correlatedJson } from "@/lib/staff-api-response";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const correlationId = randomUUID();
  const staff = await requireStaffApiSession("orders:write");
  if (!staff.ok) return staff.response;

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return correlatedJson(correlationId, { error: "Missing id" }, { status: 400 });
  }

  const origin = process.env.STOREFRONT_ORIGIN?.replace(/\/$/, "").trim();
  const secret = process.env.STOREFRONT_INTERNAL_RECONCILE_SECRET?.trim();
  if (!origin || !secret) {
    return correlatedJson(
      correlationId,
      {
        error:
          "STOREFRONT_ORIGIN and STOREFRONT_INTERNAL_RECONCILE_SECRET must be set for retry finalization.",
      },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${origin}/api/internal/reconcile-payment-attempt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({ correlationId: id.trim() }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return correlatedJson(
        correlationId,
        { error: typeof json.error === "string" ? json.error : "Retry failed" },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
      );
    }
    return correlatedJson(correlationId, json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return correlatedJson(correlationId, { error: msg }, { status: 502 });
  }
}
