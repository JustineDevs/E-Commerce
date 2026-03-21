import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/requireStaffSession";
import {
  fetchMedusaOrderJson,
  patchMedusaOrderMetadata,
} from "@/lib/medusa-order-bridge";

export async function POST(req: Request) {
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return staff.response;
  }

  const body = (await req.json().catch(() => ({}))) as {
    orderId?: string;
    trackingNumber?: string;
    carrierSlug?: string;
    labelUrl?: string;
  };

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId.startsWith("order_")) {
    return NextResponse.json({ error: "Invalid Medusa order id" }, { status: 400 });
  }

  const trackingNumber =
    typeof body.trackingNumber === "string" ? body.trackingNumber.trim() : "";
  if (!trackingNumber) {
    return NextResponse.json({ error: "Missing trackingNumber" }, { status: 400 });
  }

  const carrierSlug =
    typeof body.carrierSlug === "string" && body.carrierSlug.trim()
      ? body.carrierSlug.trim()
      : "jtexpress-ph";
  const labelUrl =
    typeof body.labelUrl === "string" && body.labelUrl.trim()
      ? body.labelUrl.trim()
      : undefined;

  const order = await fetchMedusaOrderJson(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const prev = (order.metadata as Record<string, unknown> | undefined) ?? {};
  const list = Array.isArray(prev.fulfillment_shipments)
    ? [...(prev.fulfillment_shipments as unknown[])]
    : [];

  list.push({
    id: randomUUID(),
    tracking_number: trackingNumber,
    carrier_slug: carrierSlug,
    label_url: labelUrl ?? null,
    shipped_at: new Date().toISOString(),
    status: "pending",
  });

  const meta = {
    ...prev,
    fulfillment_shipments: list,
  };

  const result = await patchMedusaOrderMetadata(orderId, meta);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Medusa update failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
