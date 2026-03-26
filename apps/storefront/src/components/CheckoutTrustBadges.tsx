export function CheckoutTrustBadges() {
  return (
    <div className="mt-10 rounded-lg border border-outline-variant/15 bg-surface-container-low/50 px-4 py-6">
      <p className="font-headline text-xs font-bold uppercase tracking-widest text-primary mb-4">
        Secure checkout
      </p>
      <ul className="grid gap-4 sm:grid-cols-3 text-sm text-on-surface-variant">
        <li className="flex flex-col gap-1">
          <span className="font-medium text-primary">Encrypted payment</span>
          <span className="text-xs leading-relaxed">
            Card and wallet details are processed by your selected payment provider on their secure
            page.
          </span>
        </li>
        <li className="flex flex-col gap-1">
          <span className="font-medium text-primary">Order tracking</span>
          <span className="text-xs leading-relaxed">
            Save your tracking link before paying so you can return without searching email.
          </span>
        </li>
        <li className="flex flex-col gap-1">
          <span className="font-medium text-primary">Philippines shipping</span>
          <span className="text-xs leading-relaxed">
            Nationwide couriers. Full address is collected on the payment step.
          </span>
        </li>
      </ul>
    </div>
  );
}
