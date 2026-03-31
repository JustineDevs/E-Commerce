import type { CatalogProductMetadataFields } from "@/lib/catalog-product-metadata";

function strOrUndef(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function numOrUndef(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/**
 * Parses `storefrontMetadata` from admin catalog API JSON body.
 */
export function parseStorefrontMetadataFromBody(
  body: Record<string, unknown>,
): CatalogProductMetadataFields | undefined {
  const raw = body.storefrontMetadata;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  return {
    brand: strOrUndef(o.brand) ?? null,
    videoUrl: strOrUndef(o.videoUrl) ?? null,
    galleryVideoUrlsText: strOrUndef(o.galleryVideoUrlsText) ?? "",
    weightKg: numOrUndef(o.weightKg) ?? null,
    dimensionsLabel: strOrUndef(o.dimensionsLabel) ?? null,
    material: strOrUndef(o.material) ?? null,
    lifestyleImageUrl: strOrUndef(o.lifestyleImageUrl) ?? null,
    seoDescription: strOrUndef(o.seoDescription) ?? null,
    relatedHandlesText: strOrUndef(o.relatedHandlesText) ?? "",
    hotspotsJson: strOrUndef(o.hotspotsJson) ?? "",
  };
}

export function parseVariantBarcodeFromBody(
  body: Record<string, unknown>,
): string | null | undefined {
  if (!("variantBarcode" in body)) return undefined;
  const v = body.variantBarcode;
  if (v === null) return null;
  if (typeof v !== "string") return null;
  return v;
}
