import type { Metadata } from "next";
import { WishlistPageClient } from "@/components/WishlistPageClient";

export const metadata: Metadata = {
  title: "Saved items",
};

export default function WishlistPage() {
  return (
    <main className="storefront-page-shell max-w-2xl">
      <h1 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
        Saved items
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Favorites you mark with the heart are stored on this browser. Sign in to
        open this page and manage your list.
      </p>
      <div className="mt-10">
        <WishlistPageClient />
      </div>
    </main>
  );
}
