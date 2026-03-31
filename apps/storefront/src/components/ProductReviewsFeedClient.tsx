"use client";

import { useMemo, useState } from "react";
import type { ProductReviewRow } from "@/lib/product-reviews";
import { StarRatingDisplay } from "@/components/ReviewStarRatingDisplay";

type SortKey = "newest" | "oldest" | "highest" | "lowest";

export function ProductReviewsFeedClient({
  reviews,
}: {
  reviews: ProductReviewRow[];
}) {
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const filtered = useMemo(() => {
    let r = [...reviews];
    if (ratingFilter !== "all") {
      r = r.filter((x) => x.rating === ratingFilter);
    }
    r.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (sort === "newest") return tb - ta;
      if (sort === "oldest") return ta - tb;
      if (sort === "highest") return b.rating - a.rating;
      return a.rating - b.rating;
    });
    return r;
  }, [reviews, ratingFilter, sort]);

  if (reviews.length === 0) return null;

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Filter by stars
          <select
            className="max-w-[200px] rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm font-normal normal-case text-on-surface"
            value={ratingFilter === "all" ? "all" : String(ratingFilter)}
            onChange={(e) => {
              const v = e.target.value;
              setRatingFilter(v === "all" ? "all" : Number(v));
            }}
          >
            <option value="all">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} stars
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Sort
          <select
            className="max-w-[220px] rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm font-normal normal-case text-on-surface"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="mb-10 text-sm text-on-surface-variant">
          No reviews match this filter. Try another star rating.
        </p>
      ) : (
        <ul className="mb-10 space-y-4 sm:space-y-5">
          {filtered.map((r) => (
            <li key={r.id}>
              <article className="rounded-xl border border-outline-variant/15 bg-surface/40 px-5 py-5 sm:px-6 dark:bg-surface/25">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-primary">{r.author_name}</p>
                      {r.is_verified_buyer ? (
                        <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-900 dark:text-emerald-100">
                          Verified buyer
                        </span>
                      ) : null}
                    </div>
                    <StarRatingDisplay
                      value={r.rating}
                      size="sm"
                      className="mt-1.5"
                    />
                  </div>
                  <time
                    className="shrink-0 text-xs text-on-surface-variant sm:pt-0.5"
                    dateTime={r.created_at}
                  >
                    {new Date(r.created_at).toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
                  {r.body}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
