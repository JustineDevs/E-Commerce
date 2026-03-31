"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
  const { status } = useSession();
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

  function remove(slug: string, name: string, medusaProductId?: string) {
    toggleWishlist({
      slug,
      name,
      ...(medusaProductId?.trim()
        ? { medusaProductId: medusaProductId.trim() }
        : {}),
    });
    refresh();
  }

  function handleExport() {
    const json = exportWishlistJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "saved-items-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRestoreFromBackup() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const count = importWishlistJSON(reader.result as string);
          refresh();
          setStatusMsg(
            `Restored ${count} new item${count !== 1 ? "s" : ""} to your saved list.`,
          );
          setTimeout(() => setStatusMsg(null), 4000);
        } catch {
          setStatusMsg(
            "That file could not be read. Use a backup you exported from this shop.",
          );
          setTimeout(() => setStatusMsg(null), 4000);
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

  if (status === "loading") {
    return <p className="text-sm text-on-surface-variant">Loading…</p>;
  }

  if (status !== "authenticated") {
    return (
      <div className="space-y-4">
        <p className="text-on-surface-variant">
          Sign in to save favorites and keep them with your account on this device.
        </p>
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent("/wishlist")}`}
          className="inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-bold text-on-primary hover:opacity-90"
        >
          Sign in to view saved items
        </Link>
      </div>
    );
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
            You have not saved anything yet.{" "}
            <Link href="/shop" className="font-medium text-primary underline">
              Browse the shop
            </Link>{" "}
            and tap the heart on a product to add it here.
          </p>
          <p className="text-xs text-on-surface-variant">
            Already have a backup from this shop? You can merge those items into this list.
          </p>
          <button
            type="button"
            onClick={handleRestoreFromBackup}
            className="rounded border border-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-on-primary"
          >
            Restore from backup file
          </button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-outline-variant/20 rounded-lg border border-outline-variant/20">
            {items.map((item) => (
              <li
                key={`${item.slug}:${item.medusaProductId ?? ""}`}
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
                    onClick={() =>
                      remove(item.slug, item.name, item.medusaProductId)
                    }
                    className="rounded border border-outline-variant px-4 py-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:border-error hover:text-error"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="rounded border border-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-on-primary"
            >
              Download backup
            </button>
            <button
              type="button"
              onClick={handleRestoreFromBackup}
              className="rounded border border-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary hover:text-on-primary"
            >
              Restore from backup
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
