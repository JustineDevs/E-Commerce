import { medusaAdminFetch } from "@/lib/medusa-admin-http";
import { optionRowsToSizeColor } from "@/lib/medusa-pos";

export type ChatOrderVariantLine = {
  variantId: string;
  label: string;
  productTitle: string;
  sku: string | null;
};

function variantDisplayLabel(
  productTitle: string,
  variant: Record<string, unknown>,
): string {
  const optRows = (variant.options ?? []) as Parameters<
    typeof optionRowsToSizeColor
  >[0];
  const { size, color } = optionRowsToSizeColor(optRows);
  const bits = [size, color].filter(Boolean);
  const opt =
    bits.length > 0
      ? bits.join(" · ")
      : String(
          (variant.title as string | undefined)?.trim() ||
            (variant.sku as string | undefined)?.trim() ||
            "Option",
        );
  return `${productTitle} — ${opt}`;
}

/**
 * Search sellable variants for chat-order intake (Medusa Admin product search, flattened).
 */
export async function searchCatalogVariantLines(
  q: string,
  limitProducts = 12,
): Promise<ChatOrderVariantLine[]> {
  const qt = q.trim();
  if (qt.length < 2) return [];
  const qs = new URLSearchParams();
  qs.set("limit", String(limitProducts));
  qs.set("q", qt);
  qs.set(
    "fields",
    "id,title,handle,*variants,*variants.sku,*variants.title,*variants.options,*variants.options.option",
  );
  const res = await medusaAdminFetch(`/admin/products?${qs.toString()}`);
  if (!res.ok) return [];
  const j = (await res.json()) as {
    products?: unknown[];
  };
  const products = Array.isArray(j.products) ? j.products : [];
  const out: ChatOrderVariantLine[] = [];
  for (const raw of products) {
    const p = raw as Record<string, unknown>;
    const productTitle = String(p.title ?? "").trim() || "Untitled";
    const variants = p.variants;
    if (!Array.isArray(variants)) continue;
    for (const v of variants) {
      const vr = v as Record<string, unknown>;
      const id = vr.id != null ? String(vr.id) : "";
      if (!id) continue;
      const sku =
        typeof vr.sku === "string" && vr.sku.trim() ? vr.sku.trim() : null;
      out.push({
        variantId: id,
        label: variantDisplayLabel(productTitle, vr),
        productTitle,
        sku,
      });
    }
  }
  return out.slice(0, 40);
}
