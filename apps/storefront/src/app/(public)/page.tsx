import nextDynamic from "next/dynamic";
import { loadStorefrontHomeContentForPublic } from "@apparel-commerce/platform-data";
import Link from "next/link";
import { StorefrontCommerceAlert } from "@/components/StorefrontCommerceAlert";
import { fetchFeaturedProducts } from "@/lib/catalog-fetch";
import {
  buildJsonLdOrganization,
  buildJsonLdWebSite,
  canonicalUrl,
} from "@/lib/seo";

const HomeScrollExperience = nextDynamic(
  () =>
    import("@/components/home/HomeScrollExperience").then((m) => ({
      default: m.HomeScrollExperience,
    })),
  {
    loading: () => (
      <div
        className="min-h-[min(72svh,40rem)] w-full animate-pulse bg-surface-container-low"
        aria-hidden
      />
    ),
    ssr: true,
  },
);

export const dynamic = "force-dynamic";

export const metadata = {
  alternates: { canonical: canonicalUrl("/") },
};

export default async function HomePage() {
  const [featured, home] = await Promise.all([
    fetchFeaturedProducts(4),
    loadStorefrontHomeContentForPublic(),
  ]);
  if (featured.kind !== "ok") {
    return (
      <main className="storefront-page-shell max-w-[1600px] pb-12">
        <div className="mx-auto max-w-2xl space-y-6 pt-8">
          <div>
            <h1 className="font-headline text-3xl font-extrabold text-primary">
              Maharlika Apparel Custom
            </h1>
            <p className="mt-2 text-on-surface-variant">
              Online store for custom apparel. Browse, order, and track
              shipments.{" "}
              <Link
                href="/privacy"
                className="font-medium text-primary underline underline-offset-4"
              >
                Privacy policy
              </Link>
            </p>
          </div>
          <StorefrontCommerceAlert failure={featured} />
        </div>
      </main>
    );
  }

  const orgJsonLd = buildJsonLdOrganization();
  const webJsonLd = buildJsonLdWebSite();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webJsonLd) }}
      />
      <HomeScrollExperience products={featured.products} home={home} />
    </>
  );
}
