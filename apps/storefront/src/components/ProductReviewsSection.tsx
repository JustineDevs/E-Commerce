import type { ProductReviewRow } from "@/lib/product-reviews";
import { ProductReviewForm } from "@/components/ProductReviewForm";

export function ProductReviewsSection({
  productSlug,
  medusaProductId,
  reviews,
}: {
  productSlug: string;
  medusaProductId: string;
  reviews: ProductReviewRow[];
}) {
  return (
    <section
      className="mt-16 border-t border-outline-variant/20 pt-16"
      aria-labelledby="reviews-heading"
    >
      <h2
        id="reviews-heading"
        className="mb-8 font-headline text-xl font-bold uppercase tracking-wider text-primary"
      >
        Reviews
      </h2>
      {reviews.length === 0 ? (
        <p className="mb-8 text-sm text-on-surface-variant">
          No reviews yet. Be the first to share your experience.
        </p>
      ) : (
        <ul className="mb-10 space-y-6">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="border-b border-outline-variant/15 pb-6 last:border-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-primary">{r.author_name}</span>
                <span className="text-xs text-on-surface-variant">
                  {new Date(r.created_at).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wider text-secondary">
                {r.rating} of 5
              </p>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      )}
      <ProductReviewForm
        productSlug={productSlug}
        medusaProductId={medusaProductId}
      />
    </section>
  );
}
