import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account",
          "/checkout",
          "/sign-in",
          "/register",
          "/preferences",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/api/",
          "/account",
          "/checkout",
          "/sign-in",
          "/register",
          "/preferences",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
