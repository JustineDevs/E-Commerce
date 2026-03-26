import type { Metadata } from "next";
import { PreferencesControls } from "@/components/PreferencesControls";

export const metadata: Metadata = {
  title: "Region & language",
};

export default function PreferencesPage() {
  return (
    <main className="storefront-page-shell max-w-2xl">
      <h1 className="font-headline text-3xl font-bold text-primary sm:text-4xl">
        Region &amp; language
      </h1>
      <div className="mt-8 space-y-6 font-body text-sm leading-relaxed text-on-surface-variant">
        <PreferencesControls />
        <section>
          <h2 className="font-headline text-lg font-bold text-primary">
            Currency
          </h2>
          <p>
            All prices are shown in <strong>Philippine Peso (PHP)</strong>{" "}
            unless a payment provider displays a processed total in another
            denomination at checkout.
          </p>
        </section>
        <section>
          <h2 className="font-headline text-lg font-bold text-primary">
            Shipping region
          </h2>
          <p>
            Fulfillment is optimised for the <strong>Philippines</strong>.
            International delivery may be unavailable or quoted case-by-case.
          </p>
        </section>
      </div>
    </main>
  );
}
