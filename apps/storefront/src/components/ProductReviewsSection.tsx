import type { ProductReviewRow } from "@/lib/product-reviews";
import { ProductReviewForm } from "@/components/ProductReviewForm";
import { ProductReviewsFeedClient } from "@/components/ProductReviewsFeedClient";
import { StarRatingDisplay } from "@/components/ReviewStarRatingDisplay";

export function ProductReviewsSection({
  productSlug,
  medusaProductId,
  reviews,
}: {
  productSlug: string;
  medusaProductId: string;
  reviews: ProductReviewRow[];
}) {
  const count = reviews.length;
  const average =
    count > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
      : 0;

  return (
    <section
      id="reviews"
      className="mt-16 border-t border-outline-variant/20 pt-12 sm:pt-16"
      aria-labelledby="reviews-heading"
    >
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest/60 p-6 shadow-sm sm:p-8 md:p-10 dark:bg-surface-container-lowest/30">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="reviews-heading"
              className="font-headline text-xl font-bold uppercase tracking-wider text-primary sm:text-2xl"
            >
              Reviews
            </h2>
            {count > 0 ? (
              <p className="mt-2 text-sm text-on-surface-variant">
                {count === 1 ? "1 review" : `${count} reviews`}
              </p>
            ) : (
              <p className="mt-2 text-sm text-on-surface-variant">
                No reviews yet. Be the first to share your experience.
              </p>
            )}
          </div>
          {count > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-headline text-3xl font-bold tabular-nums text-primary sm:text-4xl">
                {average.toFixed(1)}
              </span>
              <div className="flex flex-col gap-1">
                <StarRatingDisplay value={average} size="md" />
                <span className="text-xs text-on-surface-variant">out of 5</span>
              </div>
            </div>
          ) : null}
        </div>

        <ProductReviewsFeedClient reviews={reviews} />

        <ProductReviewForm
          productSlug={productSlug}
          medusaProductId={medusaProductId}
        />
      </div>
    </section>
  );
}
