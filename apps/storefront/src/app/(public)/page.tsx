import Link from "next/link";
import { HomeScrollExperience } from "@/components/home/HomeScrollExperience";
import { StorefrontCommerceAlert } from "@/components/StorefrontCommerceAlert";
import { fetchFeaturedProducts } from "@/lib/catalog-fetch";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = await fetchFeaturedProducts(4, 60);
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

  return <HomeScrollExperience products={featured.products} />;
}
