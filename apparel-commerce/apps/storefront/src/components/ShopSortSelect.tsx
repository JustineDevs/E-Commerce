"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Props = {
  value: string;
  category?: string;
  size?: string;
  color?: string;
  search?: string;
};

export function ShopSortSelect({ value, category, size, color, search }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function apply(sort: string) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (size) params.set("size", size);
    if (color) params.set("color", color);
    if (search?.trim()) params.set("q", search.trim());
    if (sort && sort !== "newest") params.set("sort", sort);
    startTransition(() => {
      router.push(`/shop?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-2 w-full max-w-xs">
      <label htmlFor="shop-sort" className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
        Sort
      </label>
      <select
        id="shop-sort"
        value={value}
        disabled={pending}
        onChange={(e) => apply(e.target.value)}
        className="bg-surface-container-high px-4 py-2 text-xs font-medium uppercase tracking-wider border border-outline-variant/20 rounded outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
      >
        <option value="newest">Newest first</option>
        <option value="name_asc">Name A–Z</option>
        <option value="price_asc">Price: low to high</option>
        <option value="price_desc">Price: high to low</option>
      </select>
    </div>
  );
}
