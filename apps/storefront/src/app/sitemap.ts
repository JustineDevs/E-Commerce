import type { MetadataRoute } from "next";
import { createStorefrontMedusaSdk } from "@/lib/medusa-sdk";
import { getMedusaRegionId } from "@/lib/storefront-medusa-env";
import { getBaseUrl } from "@/lib/seo";

const STATIC_PAGES: { path: string; priority: number; changeFrequency: "weekly" | "daily" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/shop", priority: 0.95, changeFrequency: "daily" },
  { path: "/collections", priority: 0.9, changeFrequency: "weekly" },
  { path: "/search", priority: 0.5, changeFrequency: "weekly" },
  { path: "/track", priority: 0.7, changeFrequency: "monthly" },
  { path: "/help", priority: 0.6, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
  { path: "/shipping", priority: 0.6, changeFrequency: "monthly" },
  { path: "/returns", priority: 0.6, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.5, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.6, changeFrequency: "monthly" },
  { path: "/cookies", priority: 0.5, changeFrequency: "monthly" },
  { path: "/accessibility", priority: 0.4, changeFrequency: "monthly" },
  { path: "/sitemap", priority: 0.4, changeFrequency: "monthly" },
];

async function fetchProductSlugs(maxItems: number): Promise<string[]> {
  const key = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? process.env.MEDUSA_PUBLISHABLE_API_KEY;
  const regionId = getMedusaRegionId();
  if (!key?.trim() || !regionId?.trim()) return [];

  try {
    const sdk = createStorefrontMedusaSdk();
    const slugs: string[] = [];
    let offset = 0;
    const pageSize = 100;

    while (slugs.length < maxItems) {
      const { products } = await sdk.store.product.list({
        region_id: regionId,
        limit: pageSize,
        offset,
        fields: "handle",
        order: "-created_at",
      });
      for (const p of products ?? []) {
        const h = (p as { handle?: string }).handle?.trim();
        if (h && !slugs.includes(h)) slugs.push(h);
      }
      if (!products?.length || products.length < pageSize) break;
      offset += pageSize;
    }
    return slugs.slice(0, maxItems);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: new Date(),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  const slugs = await fetchProductSlugs(2000);
  const productEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${base}/shop/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  return [...staticEntries, ...productEntries];
}
