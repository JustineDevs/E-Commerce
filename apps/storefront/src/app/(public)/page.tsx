import { HomeScrollExperience } from "@/components/home/HomeScrollExperience";
import { StorefrontCommerceAlert } from "@/components/StorefrontCommerceAlert";
import { fetchFeaturedProducts } from "@/lib/catalog-fetch";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = await fetchFeaturedProducts(4, 60);
  if (featured.kind !== "ok") {
    return (
      <main className="storefront-page-shell max-w-[1600px] pb-12">
        <div className="mx-auto max-w-2xl pt-8">
          <StorefrontCommerceAlert failure={featured} />
        </div>
      </main>
    );
  }

  return <HomeScrollExperience products={featured.products} />;
}
