import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="storefront-page-shell max-w-3xl font-body leading-relaxed text-on-surface-variant">
      <h1 className="font-headline text-4xl font-bold text-primary mb-8">
        Terms
      </h1>
      <p className="mb-6">
        By using this storefront you agree to purchase goods from{" "}
        <strong>Maharlika Apparel Custom</strong> under the prices,
        descriptions, and policies shown at checkout. Product images and
        measurements are illustrative; minor variance may occur between batches.
      </p>
      <ul className="list-disc pl-6 space-y-2 mb-8">
        <li>
          Payment methods supported include those shown at checkout (e.g. card,
          e-wallet, COD where offered).
        </li>
        <li>
          Orders are accepted when payment or valid payment intent is confirmed,
          subject to stock availability.
        </li>
        <li>
          Risk of loss passes to the carrier upon handoff unless otherwise
          required by law.
        </li>
      </ul>
      <p className="mb-6">
        We disclose refund and exchange procedures on our{" "}
        <Link href="/returns" className="text-primary font-medium underline">
          Returns
        </Link>{" "}
        page. Philippine consumer rules may provide additional remedies for
        defective or misdescribed goods.
      </p>
      <p className="mb-6">
        Our{" "}
        <Link href="/privacy" className="text-primary font-medium underline">
          Privacy policy
        </Link>{" "}
        and{" "}
        <Link href="/cookies" className="text-primary font-medium underline">
          Cookie notice
        </Link>{" "}
        describe data practices.
      </p>
      <p>
        <Link href="/shop" className="text-primary font-medium underline">
          Continue shopping
        </Link>
      </p>
    </main>
  );
}
