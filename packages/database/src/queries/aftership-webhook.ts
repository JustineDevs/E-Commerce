import type { SupabaseClient } from "@supabase/supabase-js";

type ShipmentRowStatus =
  | "pending"
  | "label_created"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned";

function mapAftershipTagToStatus(tag: string | undefined): ShipmentRowStatus {
  const t = (tag ?? "").toLowerCase().replace(/[\s_]/g, "");
  if (t === "pending" || t === "inforeceived") return "pending";
  if (t === "labelcreated" || t === "packageprocessing") return "label_created";
  if (t === "intransit") return "in_transit";
  if (t === "outfordelivery") return "out_for_delivery";
  if (t === "delivered") return "delivered";
  if (t === "exception" || t === "failedattempt" || t === "undeliverable") return "failed";
  if (t === "returnedtoshipper" || t === "returning") return "returned";
  return "in_transit";
}

function pickOrderId(tracking: Record<string, unknown>): string | undefined {
  const direct = tracking.order_id;
  if (typeof direct === "string" && direct) return direct;
  const custom = tracking.custom_fields as Record<string, unknown> | Record<string, string>[] | undefined;
  if (custom && !Array.isArray(custom)) {
    const oid = custom.order_id ?? custom.orderId;
    if (typeof oid === "string" && oid) return oid;
  }
  if (Array.isArray(custom)) {
    for (const row of custom) {
      if (row && typeof row === "object" && "order_id" in row && typeof (row as { order_id?: string }).order_id === "string") {
        return (row as { order_id: string }).order_id;
      }
    }
  }
  return undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function upsertShipmentFromAftershipPayload(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<{ updated: boolean; orderId?: string }> {
  const msg = payload.msg as Record<string, unknown> | undefined;
  const tracking = (msg?.tracking ?? (payload as { tracking?: Record<string, unknown> }).tracking) as
    | Record<string, unknown>
    | undefined;
  if (!tracking) {
    return { updated: false };
  }

  const orderId = pickOrderId(tracking);
  if (!orderId || !UUID_RE.test(orderId)) {
    return { updated: false };
  }

  const trackingNumber = (tracking.tracking_number ?? tracking.trackingNumber) as string | undefined;
  if (!trackingNumber?.trim()) {
    return { updated: false };
  }

  const slug = (tracking.slug ?? tracking.courier_slug ?? "aftership") as string;
  const aftershipId = (tracking.id ?? tracking.tracking_id) as string | undefined;
  const checkpoints = tracking.checkpoints as Array<{ message?: string; checkpoint_time?: string }> | undefined;
  const lastCheckpoint =
    checkpoints && checkpoints.length > 0
      ? [checkpoints[checkpoints.length - 1]?.message, checkpoints[checkpoints.length - 1]?.checkpoint_time]
          .filter(Boolean)
          .join(" · ")
      : null;

  const tag =
    (tracking.tag as string | undefined) ??
    (tracking.subtag_message as string | undefined) ??
    (tracking.subtag as string | undefined);
  const status = mapAftershipTagToStatus(tag);

  const now = new Date().toISOString();

  const row: Record<string, unknown> = {
    order_id: orderId,
    carrier_slug: typeof slug === "string" ? slug : "aftership",
    aftership_tracking_id: aftershipId ?? null,
    tracking_number: trackingNumber.trim(),
    status,
    last_checkpoint: lastCheckpoint,
    updated_at: now,
  };

  if (status === "delivered") {
    row.delivered_at = now;
  }
  if (["in_transit", "out_for_delivery", "delivered"].includes(status)) {
    row.shipped_at = now;
  }

  const { error } = await supabase.from("shipments").upsert(row, { onConflict: "tracking_number" });
  if (error) throw error;
  return { updated: true, orderId };
}
