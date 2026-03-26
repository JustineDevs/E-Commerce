"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@apparel-commerce/ui";

type Props = {
  value: string;
  category?: string;
  size?: string;
  color?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
};

export function ShopSortSelect({
  value,
  category,
  size,
  color,
  brand,
  minPrice,
  maxPrice,
  search,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function apply(sort: string) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (size) params.set("size", size);
    if (color) params.set("color", color);
    if (brand) params.set("brand", brand);
    if (minPrice != null && Number.isFinite(minPrice)) {
      params.set("minPrice", String(minPrice));
    }
    if (maxPrice != null && Number.isFinite(maxPrice)) {
      params.set("maxPrice", String(maxPrice));
    }
    if (search?.trim()) params.set("q", search.trim());
    if (sort && sort !== "newest") params.set("sort", sort);
    startTransition(() => {
      router.push(`/shop?${params.toString()}`);
    });
  }

  const labels: Record<string, string> = {
    newest: "Newest first",
    name_asc: "Name A–Z",
    price_asc: "Price: low to high",
    price_desc: "Price: high to low",
  };

  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <Label htmlFor="shop-sort" variant="form" className="font-label">
        Sort
      </Label>
      <Select
        value={value}
        disabled={pending}
        onValueChange={(v) => apply(v)}
      >
        <SelectTrigger id="shop-sort" aria-label="Sort products">
          <SelectValue placeholder={labels[value] ?? "Sort"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">{labels.newest}</SelectItem>
          <SelectItem value="name_asc">{labels.name_asc}</SelectItem>
          <SelectItem value="price_asc">{labels.price_asc}</SelectItem>
          <SelectItem value="price_desc">{labels.price_desc}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
