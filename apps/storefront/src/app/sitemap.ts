import type { MetadataRoute } from "next";
import { loadCmsSitemapEntries } from "@apparel-commerce/platform-data";
import { DEFAULT_PUBLIC_SITE_ORIGIN } from "@apparel-commerce/sdk";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_PUBLIC_SITE_ORIGIN).replace(/\/$/, "");
  const staticPaths = [
    "",
    "/shop",
    "/collections",
    "/search",
    "/blog",
    "/contact",
    "/help",
    "/faq",
    "/privacy",
    "/terms",
    "/sitemap",
  ];
  const out: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  try {
    const { pages, posts } = await loadCmsSitemapEntries();
    for (const p of pages) {
      out.push({
        url: `${base}/p/${encodeURIComponent(p.slug)}`,
        lastModified: new Date(p.updated_at),
      });
    }
    for (const p of posts) {
      out.push({
        url: `${base}/blog/${encodeURIComponent(p.slug)}`,
        lastModified: new Date(p.updated_at),
      });
    }
  } catch {
    /* Supabase optional in dev */
  }

  return out;
}
