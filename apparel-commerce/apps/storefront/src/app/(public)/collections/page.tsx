import Link from "next/link";
import { StorefrontCommerceAlert } from "@/components/StorefrontCommerceAlert";
import { fetchCategorySummaries } from "@/lib/catalog-fetch";
import { shopHref } from "@/lib/shop-url";

export const dynamic = "force-dynamic";

/** Curated category entry points; API summaries fill counts when those categories exist. */
const FEATURED_LABELS = ["Shorts", "Shirt", "Jacket"] as const;

export default async function CollectionsPage() {
  const catRes = await fetchCategorySummaries(120);
  if (catRes.kind !== "ok") {
    return (
      <main className="storefront-page-shell max-w-[1200px]">
        <div className="mx-auto max-w-2xl pt-8">
          <StorefrontCommerceAlert failure={catRes} />
        </div>
      </main>
    );
  }
  const summaries = catRes.summaries;
  const byName = new Map(summaries.map((s) => [s.category, s.count]));

  return (
    <main className="storefront-page-shell max-w-[1200px]">
      <header className="mb-10 sm:mb-12 md:mb-16">
        <p className="mb-3 font-label text-xs uppercase tracking-[0.25em] text-secondary sm:mb-4">
          Maharlika Apparel Custom
        </p>
        <h1 className="mb-4 font-headline text-4xl font-bold tracking-tighter text-primary sm:mb-6 sm:text-5xl md:text-6xl">
          Collections
        </h1>
        <p className="font-body text-on-surface-variant max-w-2xl leading-relaxed">
          Shop by category-shorts, shirts, and jackets from Maharlika Apparel
          Custom. Each link opens the catalog with that filter applied.
        </p>
      </header>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED_LABELS.map((label) => {
          const count = byName.get(label) ?? 0;
          return (
            <li key={label}>
              <Link
                href={shopHref({ category: label })}
                className="block rounded-lg border border-outline-variant/20 bg-surface-container-low p-8 transition-colors hover:border-primary/40 hover:bg-surface-container-high"
              >
                <h2 className="font-headline text-2xl font-bold text-primary mb-2">
                  {label}
                </h2>
                <p className="text-sm text-on-surface-variant">
                  {count > 0
                    ? `${count} active ${count === 1 ? "style" : "styles"}`
                    : "Browse when available"}
                </p>
                <span className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-primary">
                  Open in shop →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-12 text-center">
        <Link
          href="/shop"
          className="text-primary font-medium underline underline-offset-4"
        >
          View full catalog
        </Link>
      </p>
    </main>
  );
}
