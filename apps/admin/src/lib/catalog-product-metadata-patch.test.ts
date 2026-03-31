import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildMedusaMetadataPatch,
  EMPTY_CATALOG_METADATA_FIELDS,
} from "./catalog-product-metadata";

test("buildMedusaMetadataPatch emits stable Medusa keys for storefront mapper", () => {
  const patch = buildMedusaMetadataPatch({
    ...EMPTY_CATALOG_METADATA_FIELDS,
    brand: "BrandX",
    videoUrl: "https://example.com/v",
    weightKg: 0.5,
    dimensionsLabel: "10x10",
    material: "cotton",
    lifestyleImageUrl: "https://example.com/l",
    seoDescription: "seo",
    relatedHandlesText: "a,b",
    hotspotsJson: '[{"xPct":1,"yPct":2,"productSlug":"other"}]',
  });
  const keys = Object.keys(patch).sort();
  assert.deepEqual(keys, [
    "brand",
    "dimensions_label",
    "hotspots",
    "lifestyle_image_url",
    "material",
    "related_handles",
    "seo_description",
    "video_url",
    "weight_kg",
  ]);
});
