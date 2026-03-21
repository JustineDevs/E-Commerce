import Link from "next/link";

/** Shown for `notFound()` from PDP and other public routes; keeps nav/footer from `(public)/layout`. */
export default function PublicNotFound() {
  return (
    <main className="storefront-page-shell flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="font-label text-xs uppercase tracking-[0.2em] text-secondary mb-4">
        404
      </p>
      <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tighter text-primary text-center mb-4">
        Page not found
      </h1>
      <p className="font-body text-on-surface-variant text-center max-w-md mb-10">
        This link may be broken or the page was removed.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/shop"
          className="inline-flex items-center justify-center px-10 py-4 bg-primary text-on-primary font-medium rounded hover:opacity-90 transition-opacity"
        >
          Back to shop
        </Link>
        <Link
          href="/sitemap"
          className="inline-flex items-center justify-center px-10 py-4 border border-primary text-primary font-medium rounded hover:bg-surface-container-low transition-colors"
        >
          Site map
        </Link>
      </div>
    </main>
  );
}
