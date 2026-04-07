import type {
  Product,
  ProductGallerySlide,
  ProductImage,
  ProductImageHotspot,
  ProductVariant,
} from "@apparel-commerce/types";

import { urlLooksLikeRasterImage } from "./product-media";

type MedusaOptionRow = {
  id?: string;
  value?: string;
  option?: { id?: string; title?: string } | null;
};

type MedusaVariantRaw = {
  id?: string;
  sku?: string | null;
  barcode?: string | null;
  manage_inventory?: boolean;
  inventory_quantity?: number | null;
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
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
  images?: Array<{ id?: string; url?: string } | null> | null;
  categories?: Array<{
    id?: string;
    name?: string;
    handle?: string;
  } | null> | null;
  variants?: MedusaVariantRaw[] | null;
};

function strMeta(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  const v = meta?.[key];
  if (typeof v !== "string" || !v.trim()) return null;
  return v.trim();
}

function numMeta(meta: Record<string, unknown> | null | undefined, key: string): number | null {
  const v = meta?.[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseHotspots(meta: Record<string, unknown> | null | undefined): ProductImageHotspot[] {
  const raw = meta?.hotspots ?? meta?.image_hotspots;
  let arr: unknown[] = [];
  if (raw == null) return [];
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      arr = Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  }
  const out: ProductImageHotspot[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const x = numMeta(o, "xPct") ?? numMeta(o, "x");
    const y = numMeta(o, "yPct") ?? numMeta(o, "y");
    const slug =
      typeof o.productSlug === "string"
        ? o.productSlug
        : typeof o.slug === "string"
          ? o.slug
          : "";
    if (x == null || y == null || !slug.trim()) continue;
    const label = typeof o.label === "string" ? o.label : undefined;
    out.push({
      xPct: Math.min(100, Math.max(0, x)),
      yPct: Math.min(100, Math.max(0, y)),
      productSlug: slug.trim(),
      label,
    });
  }
  return out;
}

function parseRelatedHandles(meta: Record<string, unknown> | null | undefined): string[] {
  const raw = meta?.related_handles ?? meta?.relatedHandles;
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    if (t.startsWith("[")) {
      try {
        const p = JSON.parse(t) as unknown;
        if (Array.isArray(p)) {
          return p
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            .map((x) => x.trim());
        }
      } catch {
        return [];
      }
    }
    return t.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function brandFromMetadata(meta: Record<string, unknown> | null | undefined): string | null {
  return strMeta(meta, "brand") ?? strMeta(meta, "brand_name") ?? strMeta(meta, "legacy_brand");
}

function parseGalleryVideoUrls(meta: Record<string, unknown> | null | undefined): string[] {
  const raw = meta?.gallery_video_urls;
  if (Array.isArray(raw)) {
    return raw
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((s) => s.trim());
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p)) {
        return p
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((s) => s.trim());
      }
    } catch {
      return [];
    }
  }
  return [];
}

function buildGallerySlides(
  images: ProductImage[],
  videoUrl: string | null,
  galleryVideoUrls: string[],
): ProductGallerySlide[] {
  const slides: ProductGallerySlide[] = [];
  for (const img of images) {
    const u = img.imageUrl?.trim();
    if (u) slides.push({ kind: "image", url: u });
  }
  const videos: string[] = [];
  if (videoUrl?.trim()) videos.push(videoUrl.trim());
  for (const u of galleryVideoUrls) {
    const t = u.trim();
    if (!t) continue;
    if (!videos.includes(t)) videos.push(t);
  }
  for (const u of videos) {
    slides.push(
      urlLooksLikeRasterImage(u)
        ? { kind: "image", url: u }
        : { kind: "video", url: u },
    );
  }
  return slides;
}

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

/** Store API: unlimited when `manage_inventory === false`; else need `inventory_quantity > 0`. */
export function medusaVariantRawIsSellable(v: MedusaVariantRaw): boolean {
  if (v.manage_inventory === false) return true;
  const q = v.inventory_quantity;
  if (typeof q === "number" && Number.isFinite(q)) return q > 0;
  if (v.manage_inventory === true) return false;
  return true;
}

/** True if the raw Store API product has at least one sellable variant (no full domain map). */
export function medusaProductRawHasSellableVariant(raw: {
  variants?: MedusaVariantRaw[] | null;
}): boolean {
  return (raw.variants ?? []).some(
    (v) => v != null && medusaVariantRawIsSellable(v),
  );
}

export function productWithSellableVariantsOnly(p: Product): Product | null {
  const variants = p.variants.filter((x) => x.isActive);
  if (variants.length === 0) return null;
  if (variants.length === p.variants.length) return p;
  return { ...p, variants };
}

/** Map Medusa store product JSON and drop variants (and products) with no sellable stock. */
export function catalogProductFromMedusaRaw(raw: MedusaProductRaw): Product | null {
  const p = mapMedusaProductToProduct(raw);
  return productWithSellableVariantsOnly(p);
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
      const bc =
        typeof v.barcode === "string" && v.barcode.trim() ? v.barcode.trim() : null;
      const iq = v.inventory_quantity;
      const inventoryQuantity =
        typeof iq === "number" && Number.isFinite(iq) ? iq : null;
      const manageInventory = v.manage_inventory !== false;
      const isActive = medusaVariantRawIsSellable(v);
      return {
        id: v.id as string,
        productId: id,
        sku: v.sku ?? (v.id as string),
        barcode: bc,
        size,
        color,
        price: variantPricePhp(v),
        compareAtPrice: null,
        cost: null,
        manageInventory,
        inventoryQuantity,
        isActive,
      };
    });

  const categoryName =
    raw.categories?.find((c) => c?.name)?.name ??
    raw.categories?.find((c) => c?.handle)?.handle ??
    null;

  const meta = raw.metadata ?? null;
  const brand = brandFromMetadata(meta);
  const videoUrl = strMeta(meta, "video_url");
  const weightKg = numMeta(meta, "weight_kg");
  const dimensionsLabel =
    strMeta(meta, "dimensions_label") ?? strMeta(meta, "dimensions_cm");
  const material = strMeta(meta, "material");
  const lifestyleImageUrl = strMeta(meta, "lifestyle_image_url");
  const hotspots = parseHotspots(meta);
  const relatedHandles = parseRelatedHandles(meta);
  const seoDescription = strMeta(meta, "seo_description");
  const galleryVideoUrlsExtra = parseGalleryVideoUrls(meta);

  const createdAt =
    typeof raw.created_at === "string" && raw.created_at ? raw.created_at : null;

  const gallerySlides = buildGallerySlides(
    images,
    videoUrl,
    galleryVideoUrlsExtra,
  );

  return {
    id,
    slug: raw.handle ?? id,
    name: raw.title ?? raw.handle ?? "Product",
    description: raw.description ?? null,
    category: categoryName,
    status: raw.status ?? "published",
    brand,
    createdAt,
    images,
    gallerySlides,
    variants,
    videoUrl,
    weightKg,
    dimensionsLabel,
    material,
    lifestyleImageUrl,
    hotspots,
    relatedHandles,
    seoDescription,
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

export function productMatchesBrand(p: Product, brand: string | undefined): boolean {
  if (!brand?.trim()) return true;
  const want = brand.trim().toLowerCase();
  const b = (p.brand ?? "").trim().toLowerCase();
  return b === want;
}

export function productMatchesPriceRange(
  p: Product,
  minPrice: number | undefined,
  maxPrice: number | undefined,
): boolean {
  const price = minVariantPrice(p);
  if (minPrice != null && Number.isFinite(minPrice) && price < minPrice) return false;
  if (maxPrice != null && Number.isFinite(maxPrice) && price > maxPrice) return false;
  return true;
}

export function minVariantPrice(p: Product): number {
  if (p.variants.length === 0) return 0;
  return Math.min(...p.variants.map((v) => v.price));
}
