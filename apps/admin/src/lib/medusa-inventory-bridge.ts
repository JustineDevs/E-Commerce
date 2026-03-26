import { medusaAdminFetch } from "@/lib/medusa-admin-http";
import { optionRowsToSizeColor } from "@/lib/medusa-pos";

export type MedusaInventoryRow = {
  variantId: string;
  /** Parent product id (for aggregating stock per product on catalog). */
  productId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  available: number;
};

/** Sum available quantity per product id across all variants. */
export function aggregateStockAvailableByProductId(
  rows: MedusaInventoryRow[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const id = r.productId?.trim();
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + r.available);
  }
  return map;
}

const VARIANT_FIELDS =
  "id,sku,title,*options,*options.option,manage_inventory,*inventory_items,*inventory_items.inventory,*inventory_items.inventory.location_levels,*product";

function mapVariantsToRows(variants: unknown[]): MedusaInventoryRow[] {
  const rows: MedusaInventoryRow[] = [];
  for (const raw of variants) {
    const v = raw as Record<string, unknown>;
    const product = v.product as Record<string, unknown> | undefined;
    const productId = String(product?.id ?? "");
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

    rows.push({
      variantId: String(v.id ?? ""),
      productId,
      productName,
      sku,
      size,
      color,
      available,
    });
  }
  return rows;
}

export type MedusaInventoryPageResult = {
  rows: MedusaInventoryRow[];
  /** Total variants in the store (from API when provided). */
  total: number;
  limit: number;
  offset: number;
};

/**
 * One page of variant inventory rows (Medusa Admin product-variants list).
 */
export async function fetchMedusaInventoryPage(opts: {
  limit: number;
  offset: number;
}): Promise<MedusaInventoryPageResult> {
  const qs = new URLSearchParams();
  qs.set("limit", String(opts.limit));
  qs.set("offset", String(opts.offset));
  qs.set("fields", VARIANT_FIELDS);
  let res: Response;
  try {
    res = await medusaAdminFetch(`/admin/product-variants?${qs.toString()}`, {
      method: "GET",
    });
  } catch {
    return { rows: [], total: 0, limit: opts.limit, offset: opts.offset };
  }
  if (!res.ok) {
    return { rows: [], total: 0, limit: opts.limit, offset: opts.offset };
  }
  const json = (await res.json()) as {
    variants?: unknown[];
    count?: number;
    total?: number;
    limit?: number;
    offset?: number;
  };
  const variants = Array.isArray(json.variants) ? json.variants : [];
  const rows = mapVariantsToRows(variants);
  const limit = typeof json.limit === "number" ? json.limit : opts.limit;
  const offset = typeof json.offset === "number" ? json.offset : opts.offset;
  const apiTotal =
    typeof json.count === "number"
      ? json.count
      : typeof json.total === "number"
        ? json.total
        : undefined;
  let total: number;
  if (typeof apiTotal === "number") {
    total = apiTotal;
  } else if (variants.length < opts.limit) {
    total = offset + variants.length;
  } else {
    total = offset + variants.length + 1;
  }
  return { rows, total, limit, offset };
}

/**
 * Fetch every variant row by paging through the Admin API (use for catalog stock totals and dashboard).
 */
export async function fetchAllMedusaInventoryRows(opts?: {
  batchSize?: number;
}): Promise<MedusaInventoryRow[]> {
  const batch = opts?.batchSize ?? 100;
  const aggregated: MedusaInventoryRow[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchMedusaInventoryPage({ limit: batch, offset });
    aggregated.push(...page.rows);
    if (page.rows.length === 0) break;
    const reachedEnd =
      offset + page.rows.length >= page.total || page.rows.length < batch;
    if (reachedEnd) break;
    offset += batch;
  }
  return aggregated;
}
