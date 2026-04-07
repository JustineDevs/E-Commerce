"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Card, CardContent } from "@apparel-commerce/ui";
import type { Product } from "@apparel-commerce/types";
import { BrowsePriceFreshnessCue } from "@/components/BrowsePriceFreshnessCue";
import { QuickViewButton } from "@/components/QuickViewButton";
import { trackProductClick } from "@/lib/analytics";

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
    <Card className="overflow-hidden border-0 bg-transparent shadow-none transition-shadow duration-300 hover:shadow-md">
      <Link
        href={`/shop/${product.slug}`}
        className="group block"
        data-product-id={product.id}
        data-product-slug={product.slug}
        onClick={() => trackProductClick({ slug: product.slug, id: product.id })}
      >
        <div
          className="relative mb-6 aspect-[3/4] overflow-hidden bg-surface-container-low"
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
            <div className="absolute right-3 top-3 z-20 group/sizes">
              <Badge
                variant="outline"
                className="cursor-default select-none border-outline-variant/30 bg-surface/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary shadow-sm backdrop-blur-sm"
                aria-label={`Sizes available: ${sizes.join(", ")}`}
              >
                Sizes
              </Badge>
              <div
                role="tooltip"
                className="pointer-events-none absolute right-0 top-full z-30 mt-2 max-w-[min(240px,70vw)] opacity-0 transition-opacity duration-200 group-hover/sizes:opacity-100"
              >
                <div className="rounded-md bg-primary px-3 py-2 text-left text-xs font-medium leading-relaxed text-on-primary shadow-lg">
                  {sizes.join(" · ")}
                </div>
              </div>
            </div>
          )}

          {imageUrl ? (
            <Image
              key={imageUrl}
              src={imageUrl}
              alt={`${product.name}: image ${idx + 1}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 bg-surface-container-high" />
          )}

          <div className="pointer-events-none absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <span className="block w-full bg-primary py-3 text-center text-xs font-bold uppercase tracking-widest text-on-primary">
              View product
            </span>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="mb-1 font-headline text-lg font-bold text-primary uppercase">
                {product.name.toUpperCase()}
              </h3>
              <p className="font-body text-xs uppercase tracking-widest text-on-surface-variant">
                {firstVariant?.color ?? ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="block font-headline text-lg font-medium text-primary">
                PHP {minPrice.toLocaleString("en-PH")}
              </span>
              <BrowsePriceFreshnessCue
                slug={product.slug}
                initialMinPrice={minPrice}
              />
            </div>
          </div>
        </CardContent>
      </Link>
      <div className="px-1">
        <QuickViewButton slug={product.slug} />
      </div>
    </Card>
  );
}
