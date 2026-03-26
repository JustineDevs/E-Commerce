import { DEFAULT_PUBLIC_SITE_ORIGIN } from "@apparel-commerce/sdk";

const SITE_NAME = "Maharlika Apparel Custom";
const SITE_DESC =
  "Custom apparel and everyday craft. Shorts, shirts, and jackets built for precision. Shop Maharlika Apparel Custom in the Philippines.";

export function getBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_PUBLIC_SITE_ORIGIN;
  return url.replace(/\/$/, "");
}

export function canonicalUrl(path: string): string {
  const base = getBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  const full = `${base}${p}`;
  const protocolEnd = full.indexOf("://");
  if (protocolEnd === -1) return full.replace(/\/+/g, "/");
  const protocol = full.slice(0, protocolEnd + 3);
  const rest = full.slice(protocolEnd + 3).replace(/\/+/g, "/");
  return protocol + rest;
}

export function buildJsonLdOrganization() {
  const url = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url,
    logo: `${url}/brand/maharlika-logo-horizontal.png`,
    description: SITE_DESC,
    sameAs: [],
  };
}

export function buildJsonLdWebSite() {
  const url = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url,
    description: SITE_DESC,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildJsonLdProduct(product: {
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  images: { imageUrl: string }[];
  variants: { price: number }[];
}) {
  const base = getBaseUrl();
  const url = `${base}/shop/${product.slug}`;
  const minPrice = product.variants.length
    ? Math.min(...product.variants.map((v) => v.price))
    : 0;
  const imageList = product.images.map((i) => i.imageUrl).filter(Boolean);
  const fallbackImage = `${base}/icons/favicon-512x512.png`;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    description: product.description ?? product.name,
    image: imageList.length > 0 ? imageList : [fallbackImage],
    category: product.category ?? undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "PHP",
      price: minPrice,
      availability: "https://schema.org/InStock",
    },
  };
}

export function buildJsonLdBreadcrumb(
  items: { name: string; href: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.href.startsWith("http") ? item.href : canonicalUrl(item.href),
    })),
  };
}

export const seoDefaults = {
  siteName: SITE_NAME,
  siteDescription: SITE_DESC,
};
