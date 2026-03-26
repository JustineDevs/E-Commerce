"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  getWishlist,
  type WishlistEntry,
  toggleWishlist,
  clearWishlist,
  exportWishlistJSON,
  importWishlistJSON,
  onWishlistChange,
} from "@/lib/wishlist";

export function WishlistPageClient() {
  const [items, setItems] = useState<WishlistEntry[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setItems(getWishlist());
  }, []);

  useEffect(() => {
    refresh();
    const unsub = onWishlistChange(refresh);
    return unsub;
  }, [refresh]);

  function remove(slug: string, name: string) {
    toggleWishlist({ slug, name });
    refresh();
  }

  function handleExport() {
    const json = exportWishlistJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maharlika-wishlist.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const count = importWishlistJSON(reader.result as string);
          refresh();
          setStatusMsg(`Imported ${count} new item${count !== 1 ? "s" : ""}.`);
          setTimeout(() => setStatusMsg(null), 3000);
        } catch {
          setStatusMsg("Import failed. Check file format.");
          setTimeout(() => setStatusMsg(null), 3000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleClear() {
    clearWishlist();
    refresh();
  }

  return (
    <div className="space-y-8">
      {statusMsg && (
        <p className="text-xs text-emerald-700" role="status">
          {statusMsg}
        </p>
      )}
      {items.length === 0 ? (
        <div className="space-y-4">
          <p className="text-on-surface-variant">
            Your wishlist is empty.{" "}
            <Link href="/shop" className="font-medium text-primary underline">
              Browse the shop
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={handleImport}
            className="rounded border border-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-on-primary"
          >
            Import wishlist
          </button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-outline-variant/20 rounded-lg border border-outline-variant/20">
            {items.map((item) => (
              <li
                key={item.slug}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={`/shop/${item.slug}`}
                    className="font-headline font-semibold text-primary hover:underline"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 truncate text-xs text-on-surface-variant">
                    /{item.slug}
                  </p>
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="rounded border border-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-on-primary"
            >
              Export
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="rounded border border-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-on-primary"
            >
              Import
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded border border-outline-variant px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:border-error hover:text-error"
            >
              Clear all
            </button>
          </div>
        </>
      )}
    </div>
  );
}
