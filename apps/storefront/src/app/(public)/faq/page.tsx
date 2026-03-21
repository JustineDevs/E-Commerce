import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
};

export default function FaqPage() {
  return (
    <main className="storefront-page-shell max-w-3xl">
      <h1 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
        FAQ
      </h1>
      <p className="mt-3 text-sm text-on-surface-variant">
        For case-specific help,{" "}
        <Link href="/contact" className="text-primary underline">
          contact us
        </Link>
        .
      </p>
      <dl className="mt-10 space-y-4">
        <details className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4">
          <summary className="cursor-pointer font-headline text-sm font-bold text-primary">
            Can I exchange sizes?
          </summary>
          <p className="mt-3 text-sm text-on-surface-variant">
            Eligible unused items may qualify within <strong>7 days</strong>.
            See{" "}
            <Link href="/returns" className="underline">
              Returns
            </Link>
            .
          </p>
        </details>
        <details className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4">
          <summary className="cursor-pointer font-headline text-sm font-bold text-primary">
            Wrong or defective item?
          </summary>
          <p className="mt-3 text-sm text-on-surface-variant">
            Contact us with photos and order number for replacement, exchange,
            or refund after review.
          </p>
        </details>
        <details className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4">
          <summary className="cursor-pointer font-headline text-sm font-bold text-primary">
            Track my order
          </summary>
          <p className="mt-3 text-sm text-on-surface-variant">
            Use{" "}
            <Link href="/track" className="underline">
              Track order
            </Link>
            .
          </p>
        </details>
        <details className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-4">
          <summary className="cursor-pointer font-headline text-sm font-bold text-primary">
            Carriers
          </summary>
          <p className="mt-3 text-sm text-on-surface-variant">
            Nationwide couriers including J&amp;T. See{" "}
            <Link href="/shipping" className="underline">
              Shipping
            </Link>
            .
          </p>
        </details>
      </dl>
    </main>
  );
}
