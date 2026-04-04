export function mapAftershipTag(tag: string | undefined): string {
  const t = (tag ?? "").toLowerCase().replace(/[\s_]/g, "");
  if (t === "delivered") return "delivered";
  if (t === "outfordelivery") return "out_for_delivery";
  if (t === "intransit") return "in_transit";
  if (t === "pending" || t === "inforeceived") return "pending";
  return "in_transit";
}
