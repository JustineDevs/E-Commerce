import type {
  Product,
  ProductImage,
  ProductVariant,
} from "@apparel-commerce/types";

type MedusaOptionRow = {
  id?: string;
  value?: string;
  option?: { id?: string; title?: string } | null;
};

type MedusaVariantRaw = {
  id?: string;
  sku?: string | null;
  manage_inventory?: boolean;
  calculated_price?: {
    calculated_amount?: number | null;
    currency_code?: string | null;
  } | null;
  options?: MedusaOptionRow[] | null;
};

type MedusaProductRaw = {
  id?: string;
  title?: string;
  handle?: string;
  description?: string | null;
  thumbnail?: string | null;
  status?: string;
  images?: Array<{ id?: string; url?: string } | null> | null;
  categories?: Array<{
    id?: string;
    name?: string;
    handle?: string;
  } | null> | null;
  variants?: MedusaVariantRaw[] | null;
};

function optionRowsToSizeColor(rows: MedusaOptionRow[] | null | undefined): {
  size: string;
  color: string;
} {
  let size = "";
  let color = "";
  for (const row of rows ?? []) {
    const title = (row.option?.title ?? "").toLowerCase();
    const val = String(row.value ?? "").trim();
    if (!val) continue;
    if (title.includes("size") || title === "sizes") {
      size = val;
    } else if (title.includes("color") || title.includes("colour")) {
      color = val;
    }
  }
  if (!size && !color && rows?.length === 1) {
    size = String(rows[0]?.value ?? "").trim();
  }
  return { size, color };
}

function variantPricePhp(v: MedusaVariantRaw): number {
  const amt = v.calculated_price?.calculated_amount;
  if (typeof amt !== "number" || !Number.isFinite(amt)) {
    return 0;
  }
  return Math.round((amt / 100) * 100) / 100;
}

export function mapMedusaProductToProduct(raw: MedusaProductRaw): Product {
  const id = raw.id ?? "unknown";
  const images: ProductImage[] = (raw.images ?? [])
    .filter(Boolean)
    .map((img, i) => ({
      id: img?.id ?? `${id}-img-${i}`,
      productId: id,
      imageUrl: img?.url ?? raw.thumbnail ?? "",
      sortOrder: i,
    }));

  if (images.length === 0 && raw.thumbnail) {
    images.push({
      id: `${id}-thumb`,
      productId: id,
      imageUrl: raw.thumbnail,
      sortOrder: 0,
    });
  }

  const variants: ProductVariant[] = (raw.variants ?? [])
    .filter((v): v is MedusaVariantRaw => Boolean(v?.id))
    .map((v) => {
      const { size, color } = optionRowsToSizeColor(v.options ?? []);
      return {
        id: v.id as string,
        productId: id,
        sku: v.sku ?? (v.id as string),
        barcode: null,
        size,
        color,
        price: variantPricePhp(v),
        compareAtPrice: null,
        cost: null,
        isActive: v.manage_inventory !== false,
      };
    });

  const categoryName =
    raw.categories?.find((c) => c?.name)?.name ??
    raw.categories?.find((c) => c?.handle)?.handle ??
    null;

  return {
    id,
    slug: raw.handle ?? id,
    name: raw.title ?? raw.handle ?? "Product",
    description: raw.description ?? null,
    category: categoryName,
    status: raw.status ?? "published",
    brand: null,
    images,
    variants,
  };
}

export function productMatchesVariantFilters(
  p: Product,
  size: string | undefined,
  color: string | undefined,
): boolean {
  if (size?.trim()) {
    const want = size.trim();
    if (!p.variants.some((v) => v.size === want)) return false;
  }
  if (color?.trim()) {
    const want = color.trim();
    if (!p.variants.some((v) => v.color === want)) return false;
  }
  return true;
}

export function minVariantPrice(p: Product): number {
  if (p.variants.length === 0) return 0;
  return Math.min(...p.variants.map((v) => v.price));
}
