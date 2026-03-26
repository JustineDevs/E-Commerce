"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Product } from "@apparel-commerce/types";
import { AddToCartSection } from "@/components/AddToCartSection";
import { minVariantPrice } from "@/lib/medusa-catalog-mapper";

export function ProductQuickViewModal({
  slug,
  onClose,
}: {
  slug: string;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/shop/product?slug=${encodeURIComponent(slug)}`,
        );
        const data = (await res.json()) as {
          product?: Product;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Unable to load");
          return;
        }
        if (data.product) setProduct(data.product);
      } catch {
        if (!cancelled) setError("Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-surface-container-lowest p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2
            id="quick-view-title"
            className="font-headline text-xl font-bold text-primary"
          >
            {product?.name ?? "Loading…"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-outline-variant/30 px-3 py-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant hover:bg-surface-container-low"
          >
            Close
          </button>
        </div>
        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : product ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-surface-container-low">
              {product.images[0]?.imageUrl ? (
                <Image
                  src={product.images[0].imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              ) : null}
            </div>
            <div>
              <p className="mb-4 text-lg font-medium text-primary">
                PHP {minVariantPrice(product).toLocaleString("en-PH")}
              </p>
              {product.brand ? (
                <p className="mb-2 text-xs uppercase tracking-wider text-secondary">
                  {product.brand}
                </p>
              ) : null}
              <AddToCartSection product={product} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">Loading product…</p>
        )}
      </div>
    </div>
  );
}
