"use client";

import { useCallback, useEffect, useState } from "react";
import { toggleWishlist, wishlistContains } from "@/lib/wishlist";

type Props = {
  slug: string;
  name: string;
  className?: string;
};

export function WishlistToggle({ slug, name, className = "" }: Props) {
  const [on, setOn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOn(wishlistContains(slug));
  }, [slug]);

  const handleClick = useCallback(() => {
    const next = toggleWishlist({ slug, name });
    setOn(next);
  }, [slug, name]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={on}
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      className={`inline-flex items-center justify-center rounded border border-outline-variant/40 p-3 transition-colors hover:border-primary ${className}`}
    >
      <span
        className={`material-symbols-outlined text-[22px] ${on ? "text-primary" : "text-on-surface-variant"}`}
        style={on ? { fontVariationSettings: '"FILL" 1' } : undefined}
      >
        favorite
      </span>
      {!mounted ? <span className="sr-only">Wishlist</span> : null}
    </button>
  );
}
