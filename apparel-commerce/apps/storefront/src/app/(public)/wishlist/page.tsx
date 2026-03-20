import type { Metadata } from "next";
import { WishlistPageClient } from "@/components/WishlistPageClient";

export const metadata: Metadata = {
  title: "Wishlist",
};

export default function WishlistPage() {
  return (
    <main className="mx-auto max-w-2xl px-[clamp(0.75rem,4vw,2rem)] pb-24 pt-24 sm:pt-32">
      <h1 className="font-headline text-3xl font-bold text-primary sm:text-4xl">Wishlist</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Saved on this device. Signing in on other browsers will not sync this list yet.
      </p>
      <div className="mt-10">
        <WishlistPageClient />
      </div>
    </main>
  );
}
