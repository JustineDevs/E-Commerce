import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Warranty",
  description: "Product warranty and protection information for Maharlika Apparel Custom.",
};

const PDF_URL = process.env.NEXT_PUBLIC_WARRANTY_PDF_URL?.trim() ?? "";

export default function WarrantyPage() {
  return (
    <main className="storefront-page-shell max-w-3xl font-body leading-relaxed text-on-surface-variant">
      <h1 className="font-headline text-4xl font-bold text-primary mb-8">Warranty</h1>
      <p className="mb-6">
        This page summarizes how we stand behind manufacturing quality. Specific coverage can vary
        by product line. Always keep your order confirmation and care labels.
      </p>

      {PDF_URL ? (
        <p className="mb-8">
          <a
            href={PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded bg-primary px-5 py-2.5 text-sm font-medium text-on-primary hover:opacity-90"
          >
            Download warranty PDF
          </a>
        </p>
      ) : null}

      <h2 className="font-headline text-lg font-bold text-primary mt-10 mb-4">
        Manufacturing defects
      </h2>
      <p className="mb-4">
        If an item arrives with a clear manufacturing defect (for example broken stitching that
        was not caused by wear, or a zipper that fails before first use), contact support with
        photos and your order number. We will confirm eligibility and next steps.
      </p>

      <h2 className="font-headline text-lg font-bold text-primary mt-10 mb-4">
        What is not covered
      </h2>
      <ul className="list-disc pl-6 space-y-2 mb-8">
        <li>Normal wear, fading, or shrinkage after washing against care instructions.</li>
        <li>Damage from misuse, alterations, or third-party repairs.</li>
        <li>Loss or damage after successful delivery to the address on the order.</li>
      </ul>

      <h2 className="font-headline text-lg font-bold text-primary mt-10 mb-4">
        How to claim
      </h2>
      <p className="mb-4">
        Email or message us through{" "}
        <Link href="/contact" className="text-primary font-medium underline">
          Contact
        </Link>{" "}
        within a reasonable time after you notice the issue. Include order ID, a short description,
        and clear photos. We aim to respond within a few business days.
      </p>

      <p>
        <Link href="/returns" className="text-primary font-medium underline">
          Returns &amp; exchanges policy
        </Link>
        {" · "}
        <Link href="/shipping" className="text-primary font-medium underline">
          Shipping
        </Link>
      </p>
    </main>
  );
}
