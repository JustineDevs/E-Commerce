import Link from "next/link";

export default function ReturnsPage() {
  return (
    <main className="pt-32 pb-24 px-8 max-w-3xl mx-auto font-body text-on-surface-variant leading-relaxed">
      <h1 className="font-headline text-4xl font-bold text-primary mb-8">Returns &amp; exchanges</h1>
      <p className="mb-6">
        We accept returns or exchanges for defective, damaged, incorrectly delivered, or materially different items.
        For eligible non-defective apparel, we may allow <strong>size exchange within 7 days</strong> of receipt,
        provided the item is unused, unwashed, unaltered, with original tags, packaging, and proof of purchase.
      </p>
      <h2 className="font-headline text-lg font-bold text-primary mt-10 mb-4">Eligible cases</h2>
      <ul className="list-disc pl-6 space-y-2 mb-8">
        <li>Wrong item, size, or color shipped.</li>
        <li>Damaged goods or manufacturing defect.</li>
        <li>Item substantially different from the listing.</li>
        <li>Parcel lost in transit or undelivered after carrier investigation.</li>
      </ul>
      <h2 className="font-headline text-lg font-bold text-primary mt-10 mb-4">Non-returnable</h2>
      <p className="mb-4">
        Unless defective or incorrectly shipped: used, washed, or altered items; items without tags or proof of purchase;
        final-sale items if marked as such; hygiene-sensitive categories (underwear, socks, swimwear bottoms, etc.).
      </p>
      <h2 className="font-headline text-lg font-bold text-primary mt-10 mb-4">How to request</h2>
      <p className="mb-4">
        Contact support within <strong>7 days of delivery</strong> with order number, reason, clear photos or video, and
        preferred resolution (exchange, replacement, store credit, or refund). We review complete submissions within{" "}
        <strong>2–5 business days</strong>.
      </p>
      <p className="mb-4">
        <strong>Seller fault:</strong> replacement, exchange, or refund as approved—no remedy cost passed to you for valid
        defect claims. <strong>Customer size change:</strong> exchange may be offered; return shipping may be
        customer-paid unless we subsidize as a courtesy.
      </p>
      <p>
        <Link href="/shipping" className="text-primary font-medium underline">
          Shipping information
        </Link>
      </p>
    </main>
  );
}
