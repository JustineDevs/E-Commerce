import { NextResponse } from "next/server";
import {
  getMedusaAdminSdk,
  getMedusaRegionId,
  getMedusaSalesChannelId,
} from "@/lib/medusa-pos";
import { requireStaffSession } from "@/lib/requireStaffSession";

export async function POST(req: Request) {
  const staff = await requireStaffSession();
  if (!staff.ok) {
    return staff.response;
  }

  const adminSdk = getMedusaAdminSdk();
  const regionId = getMedusaRegionId();
  const salesChannelId = getMedusaSalesChannelId();
  if (!adminSdk || !regionId || !salesChannelId) {
    return NextResponse.json(
      {
        error:
          "Medusa POS env incomplete (MEDUSA_SECRET_API_KEY, MEDUSA_REGION_ID, MEDUSA_SALES_CHANNEL_ID)",
      },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    items?: Array<{ variantId: string; quantity: number }>;
    email?: string;
  };
  const items = body.items ?? [];
  if (items.length === 0) {
    return NextResponse.json({ error: "No items" }, { status: 400 });
  }

  try {
    const { draft_order } = await adminSdk.admin.draftOrder.create({
      email: (body.email?.trim() || "pos@instore.local").slice(0, 320),
      region_id: regionId,
      sales_channel_id: salesChannelId,
      items: items.map((i) => ({
        variant_id: i.variantId,
        quantity: Math.max(1, Math.floor(i.quantity)),
      })),
    });

    if (!draft_order?.id) {
      return NextResponse.json(
        { error: "Draft order missing id from Medusa" },
        { status: 502 },
      );
    }

    const { order } = await adminSdk.admin.draftOrder.convertToOrder(
      draft_order.id,
    );

    const orderNumber =
      order?.display_id != null ? String(order.display_id) : order?.id ?? "";

    return NextResponse.json({ orderNumber });
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Could not complete Medusa POS sale";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
