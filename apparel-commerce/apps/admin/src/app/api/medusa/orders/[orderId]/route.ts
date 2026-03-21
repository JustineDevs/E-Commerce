import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/requireStaffSession";
import {
  fetchMedusaOrderJson,
  patchMedusaOrderMetadata,
} from "@/lib/medusa-order-bridge";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return staff.response;
  }

  const { orderId } = await ctx.params;
  if (!orderId?.startsWith("order_")) {
    return NextResponse.json({ error: "Invalid Medusa order id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!status) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }

  const order = await fetchMedusaOrderJson(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const prev = (order.metadata as Record<string, unknown> | undefined) ?? {};
  const meta = { ...prev, oms_status: status };
  const result = await patchMedusaOrderMetadata(orderId, meta);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Medusa update failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ status });
}
