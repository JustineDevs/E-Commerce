import type { MetadataRoute } from "next";
import { DEFAULT_PUBLIC_SITE_ORIGIN } from "@apparel-commerce/sdk";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_PUBLIC_SITE_ORIGIN).replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/account"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
