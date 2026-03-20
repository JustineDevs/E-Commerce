"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getWishlist, type WishlistEntry, toggleWishlist } from "@/lib/wishlist";

export function WishlistPageClient() {
  const [items, setItems] = useState<WishlistEntry[]>([]);

  const refresh = useCallback(() => {
    setItems(getWishlist());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function remove(slug: string, name: string) {
    toggleWishlist({ slug, name });
    refresh();
  }

  return (
    <div className="space-y-8">
      {items.length === 0 ? (
        <p className="text-on-surface-variant">
          Your wishlist is empty.{" "}
          <Link href="/shop" className="font-medium text-primary underline">
            Browse the shop
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-outline-variant/20 rounded-lg border border-outline-variant/20">
          {items.map((item) => (
            <li key={item.slug} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link href={`/shop/${item.slug}`} className="font-headline font-semibold text-primary hover:underline">
                  {item.name}
                </Link>
                <p className="mt-1 truncate text-xs text-on-surface-variant">/{item.slug}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/shop/${item.slug}`}
                  className="rounded border border-primary px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-on-primary"
                >
                  View
                </Link>
                <button
                  type="button"
                  onClick={() => remove(item.slug, item.name)}
                  className="rounded border border-outline-variant px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:border-error hover:text-error"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
