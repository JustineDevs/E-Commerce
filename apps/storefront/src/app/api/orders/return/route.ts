import { enqueueJob, insertCustomerReturnRequestAudit } from "@apparel-commerce/platform-data";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { medusaAdminFetch } from "@/lib/medusa-admin-fetch";
import { createStorefrontServiceSupabase } from "@/lib/storefront-supabase";
import {
  getRequestIp,
  rateLimitFixedWindow,
} from "@/lib/storefront-api-rate-limit";

type ReturnItem = {
  item_id?: string;
  quantity?: number;
  reason_id?: string;
  note?: string;
};

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = await rateLimitFixedWindow(`order-return:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { orderId?: string; items?: ReturnItem[]; note?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId.startsWith("order_")) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((it) => ({
      item_id: typeof it.item_id === "string" ? it.item_id.trim() : "",
      quantity:
        typeof it.quantity === "number" && Number.isFinite(it.quantity)
          ? Math.max(1, Math.floor(it.quantity))
          : 0,
      reason_id:
        typeof it.reason_id === "string" && it.reason_id.trim()
          ? it.reason_id.trim()
          : undefined,
      note:
        typeof it.note === "string" && it.note.trim() ? it.note.trim() : undefined,
    }))
    .filter((it) => it.item_id.length > 0 && it.quantity > 0);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Select at least one line to return" },
      { status: 400 },
    );
  }

  const orderRes = await medusaAdminFetch(
    `/admin/orders/${encodeURIComponent(orderId)}?fields=id,email`,
  );
  if (!orderRes.ok) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const orderJson = (await orderRes.json()) as {
    order?: { email?: string | null };
  };
  const orderEmail = orderJson.order?.email?.trim().toLowerCase();
  if (!orderEmail || orderEmail !== email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload: Record<string, unknown> = {
    items: items.map((it) => ({
      item_id: it.item_id,
      quantity: it.quantity,
      ...(it.reason_id ? { reason_id: it.reason_id } : {}),
      ...(it.note ? { note: it.note } : {}),
    })),
  };
  if (typeof body.note === "string" && body.note.trim()) {
    payload.note = body.note.trim();
  }

  const returnRes = await medusaAdminFetch(
    `/admin/orders/${encodeURIComponent(orderId)}/return`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (!returnRes.ok) {
    const t = await returnRes.text().catch(() => "");
    return NextResponse.json(
      { error: "Return request failed", detail: t.slice(0, 300) },
      { status: 502 },
    );
  }

  const data = (await returnRes.json()) as unknown;

  const sb = createStorefrontServiceSupabase();
  let staffJobId: string | null = null;
  if (sb) {
    staffJobId = await enqueueJob(
      sb,
      "return_request_review",
      { order_id: orderId, email },
      "storefront_return",
    ).catch(() => null);
    await insertCustomerReturnRequestAudit(sb, {
      medusaOrderId: orderId,
      customerEmail: email,
      items: items.map((it) => ({ ...it })),
      note: typeof body.note === "string" ? body.note.trim() || null : null,
      medusaResponse: data,
      staffReviewJobId: staffJobId,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, data });
}
