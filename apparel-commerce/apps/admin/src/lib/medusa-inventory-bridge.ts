import { medusaAdminFetch } from "@/lib/medusa-admin-http";
import { optionRowsToSizeColor } from "@/lib/medusa-pos";

export type MedusaInventoryRow = {
  variantId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  available: number;
};

export async function fetchMedusaInventoryForAdmin(): Promise<
  MedusaInventoryRow[]
> {
  const qs = new URLSearchParams();
  qs.set("limit", "200");
  qs.set(
    "fields",
    "id,sku,title,*options,*options.option,manage_inventory,*inventory_items,*inventory_items.inventory,*inventory_items.inventory.location_levels,*product",
  );
  const res = await medusaAdminFetch(
    `/admin/product-variants?${qs.toString()}`,
    { method: "GET" },
  );
  if (!res.ok) {
    return [];
  }
  const json = (await res.json()) as { variants?: unknown[] };
  const variants = Array.isArray(json.variants) ? json.variants : [];

  const rows: MedusaInventoryRow[] = [];
  for (const raw of variants) {
    const v = raw as Record<string, unknown>;
    const product = v.product as Record<string, unknown> | undefined;
    const productName = String(product?.title ?? v.title ?? "");
    const sku = String(v.sku ?? "");

    const optionRows = v.options as
      | Array<{
          option?: { title?: string | null } | null;
          value?: string | null;
        }>
      | undefined;
    const { size, color } = optionRowsToSizeColor(optionRows);

    let available = 0;
    const inventoryItems = v.inventory_items as unknown[] | undefined;
    if (Array.isArray(inventoryItems)) {
      for (const ii of inventoryItems) {
        const item = ii as Record<string, unknown>;
        const inv = item.inventory as Record<string, unknown> | undefined;
        const levels = inv?.location_levels as unknown[] | undefined;
        if (Array.isArray(levels)) {
          for (const lvl of levels) {
            const l = lvl as Record<string, unknown>;
            const stocked = Number(l.stocked_quantity ?? 0);
            const reserved = Number(l.reserved_quantity ?? 0);
            available += Math.max(0, stocked - reserved);
          }
        }
      }
    }

    rows.push({ variantId: String(v.id ?? ""), productName, sku, size, color, available });
  }
  return rows;
}
