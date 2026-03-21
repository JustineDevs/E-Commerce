"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@apparel-commerce/types";
import { addCartLine, type CartLine } from "@/lib/cart";
import { WishlistToggle } from "@/components/WishlistToggle";

export function AddToCartSection({ product }: { product: Product }) {
  const router = useRouter();
  const sizes = useMemo(
    () => [...new Set(product.variants.map((v) => v.size))].sort(),
    [product.variants],
  );
  const colors = useMemo(
    () => [...new Set(product.variants.map((v) => v.color))],
    [product.variants],
  );
  const [size, setSize] = useState(sizes[0] ?? "");
  const [color, setColor] = useState(colors[0] ?? "");

  const variant = useMemo(
    () => product.variants.find((v) => v.size === size && v.color === color),
    [product.variants, size, color],
  );

  function handleAddToBag() {
    if (!variant) return;
    const line: CartLine = {
      variantId: variant.id,
      quantity: 1,
      slug: product.slug,
      name: product.name,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      price: variant.price,
    };
    addCartLine(line);
    router.push("/checkout");
  }

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <p className="text-xs font-label font-bold uppercase tracking-wider">
          Color:{" "}
          <span className="text-secondary font-normal">{color || "None"}</span>
        </p>
        <div className="flex flex-wrap gap-3">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-10 h-10 rounded-full bg-surface-container-high ring-1 transition-all ${
                color === c
                  ? "ring-2 ring-primary scale-105"
                  : "ring-outline-variant hover:ring-primary"
              }`}
              title={c}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <p className="text-xs font-label font-bold uppercase tracking-wider">
            Size
          </p>
          <span className="text-xs font-label text-secondary">Select one</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`py-3 text-sm font-medium transition-all ${
                size === s
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low hover:bg-surface-container-high"
              }`}
              aria-pressed={size === s}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-4 min-[400px]:flex-row min-[400px]:items-stretch">
        <WishlistToggle
          slug={product.slug}
          name={product.name}
          className="min-[400px]:shrink-0"
        />
        <button
          type="button"
          data-testid="pdp-add-to-bag"
          disabled={!variant}
          onClick={handleAddToBag}
          className="min-h-[52px] flex-1 py-4 px-4 bg-primary text-on-primary font-headline font-bold tracking-tight rounded text-center hover:opacity-90 active:scale-[0.99] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          Add to bag and checkout
        </button>
      </div>
    </div>
  );
}
