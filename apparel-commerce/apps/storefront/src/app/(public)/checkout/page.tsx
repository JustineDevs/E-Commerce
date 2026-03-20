import Link from "next/link";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <main className="pt-32 pb-24 px-8 max-w-4xl mx-auto">
      <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary mb-2">
        Checkout
      </h1>
      <p className="font-body text-on-surface-variant mb-12">
        Complete your purchase.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section>
            <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-4">
              Shipping Address
            </h2>
            <form className="space-y-4">
              <input
                type="text"
                placeholder="Full name"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-4 py-3 font-body text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="tel"
                placeholder="Phone"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-4 py-3 font-body text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Address line 1"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-4 py-3 font-body text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Barangay"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-4 py-3 font-body text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-4 py-3 font-body text-sm outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Province"
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-4 py-3 font-body text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </form>
          </section>
        </div>

        <div>
          <div className="bg-surface-container-lowest rounded shadow-[0px_20px_40px_rgba(0,0,0,0.02)] p-6">
            <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-6">
              Order Summary
            </h2>
            <div className="space-y-4 text-sm text-on-surface-variant">
              <p>Your cart is empty.</p>
              <Link
                href="/shop"
                className="inline-block text-primary font-medium hover:underline"
              >
                Continue shopping
              </Link>
            </div>
            <div className="mt-8 pt-6 border-t border-surface-container-high space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Subtotal</span>
                <span>PHP 0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Shipping</span>
                <span>Calculated at next step</span>
              </div>
              <div className="flex justify-between font-headline font-bold text-lg pt-2">
                <span>Total</span>
                <span>PHP 0.00</span>
              </div>
            </div>
            <button
              disabled
              className="w-full mt-6 py-4 bg-surface-container-high text-on-surface-variant font-medium rounded cursor-not-allowed"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
