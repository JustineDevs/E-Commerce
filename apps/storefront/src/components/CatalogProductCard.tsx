"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@apparel-commerce/types";

type Props = {
  product: Product;
  /** Image rotation interval while the card is hovered (ms). */
  intervalMs?: number;
};

export function CatalogProductCard({ product, intervalMs = 3000 }: Props) {
  const urls = product.images.map((i) => i.imageUrl).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sizes = [...new Set(product.variants.map((v) => v.size))].sort();
  const minPrice = Math.min(...product.variants.map((v) => v.price));

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (urls.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % urls.length);
    }, intervalMs);
  }, [clearTimer, intervalMs, urls.length]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const imageUrl = urls[idx] ?? urls[0];
  const firstVariant = product.variants[0];

  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      <div
        className="relative overflow-hidden bg-surface-container-low aspect-[3/4] mb-6"
        onMouseEnter={() => {
          setIdx(0);
          startTimer();
        }}
        onMouseLeave={() => {
          clearTimer();
          setIdx(0);
        }}
      >
        {sizes.length > 0 && (
          <div className="absolute top-3 right-3 z-20 group/sizes">
            <span
              className="inline-flex cursor-default select-none text-[10px] font-bold uppercase tracking-wider bg-surface/95 text-primary px-2 py-1 rounded border border-outline-variant/30 shadow-sm backdrop-blur-sm"
              aria-label={`Sizes available: ${sizes.join(", ")}`}
            >
              Sizes
            </span>
            <div
              role="tooltip"
              className="pointer-events-none absolute right-0 top-full mt-2 max-w-[min(240px,70vw)] opacity-0 transition-opacity duration-200 group-hover/sizes:opacity-100 z-30"
            >
              <div className="rounded-md bg-primary text-on-primary text-xs px-3 py-2 shadow-lg font-medium leading-relaxed text-left">
                {sizes.join(" · ")}
              </div>
            </div>
          </div>
        )}

        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${product.name}: image ${idx + 1}`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="absolute inset-0 bg-surface-container-high" />
        )}

        <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
          <span className="block w-full bg-primary text-on-primary py-3 text-xs font-bold uppercase tracking-widest text-center">
            View product
          </span>
        </div>
      </div>
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="font-headline text-lg font-bold text-primary mb-1">
            {product.name.toUpperCase()}
          </h3>
          <p className="font-body text-xs text-on-surface-variant uppercase tracking-widest">
            {firstVariant?.color ?? ""}
          </p>
        </div>
        <span className="font-headline text-lg font-medium text-primary shrink-0">
          PHP {minPrice.toLocaleString("en-PH")}
        </span>
      </div>
    </Link>
  );
}
