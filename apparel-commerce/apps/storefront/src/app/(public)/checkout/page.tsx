"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PUBLIC_SITE_ORIGIN } from "@apparel-commerce/sdk";
import {
  readCart,
  updateLineQuantity,
  clearCart,
  type CartLine,
} from "@/lib/cart";
import { startMedusaLemonCheckout } from "@/lib/medusa-checkout";

const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_PUBLIC_SITE_ORIGIN
).replace(/\/$/, "");

export default function CheckoutPage() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    checkoutUrl: string;
    trackingPageUrl: string;
  } | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const refresh = useCallback(() => {
    setLines(readCart());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const tax = Math.round(subtotal * 0.085 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  async function handlePay() {
    if (lines.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const { checkoutUrl, cartId } = await startMedusaLemonCheckout({
        lines: lines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
        })),
        email: email.trim() || undefined,
      });
      const path = `/track/${encodeURIComponent(cartId)}`;
      const trackingPageUrl = SITE_ORIGIN ? `${SITE_ORIGIN}${path}` : path;
      setPendingPayment({
        checkoutUrl,
        trackingPageUrl,
      });
      setCopyDone(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    }
    setLoading(false);
  }

  function continueToHostedCheckout() {
    if (!pendingPayment) return;
    clearCart();
    window.location.href = pendingPayment.checkoutUrl;
  }

  async function copyTrackingLink() {
    if (!pendingPayment || typeof navigator.clipboard?.writeText !== "function")
      return;
    try {
      await navigator.clipboard.writeText(pendingPayment.trackingPageUrl);
      setCopyDone(true);
    } catch {
      setCopyDone(false);
    }
  }

  return (
    <main className="storefront-page-shell motion-surface max-w-4xl">
      <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary mb-2">
        Checkout
      </h1>
      <p className="font-body text-on-surface-variant mb-12 max-w-lg">
        Review your bag. Payment runs on Lemon Squeezy. Stock is reserved while
        you complete checkout.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section>
            <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-4">
              Contact
            </h2>
            <label className="block text-xs font-medium text-on-surface-variant mb-2">
              Email for receipt
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-4 py-3 font-body text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </section>

          <section>
            <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-4">
              Shipping
            </h2>
            <p className="text-sm text-on-surface-variant">
              You will enter the full shipping address on the payment page after
              continuing.
            </p>
          </section>
        </div>

        <div>
          <div className="bg-surface-container-lowest rounded-lg shadow-[0px_20px_40px_rgba(0,0,0,0.02)] p-6 border border-outline-variant/10">
            <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-6">
              Order summary
            </h2>

            {lines.length === 0 ? (
              <div className="space-y-4 text-center py-8">
                <p className="text-on-surface-variant text-sm">
                  Your bag is empty.
                </p>
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center text-primary font-medium text-sm hover:opacity-80 transition-opacity"
                >
                  Browse the shop
                </Link>
              </div>
            ) : (
              <ul className="space-y-4 text-sm">
                {lines.map((l) => (
                  <li
                    key={l.variantId}
                    className="flex justify-between gap-4 border-b border-surface-container-high pb-4"
                  >
                    <div>
                      <p className="font-medium text-primary">{l.name}</p>
                      <p className="text-on-surface-variant text-xs mt-1">
                        {l.sku} · {l.size} / {l.color}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          className="w-8 h-8 rounded bg-surface-container-high text-sm"
                          onClick={() => {
                            updateLineQuantity(l.variantId, l.quantity - 1);
                            refresh();
                          }}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-bold">
                          {l.quantity}
                        </span>
                        <button
                          type="button"
                          className="w-8 h-8 rounded bg-surface-container-high text-sm"
                          onClick={() => {
                            updateLineQuantity(l.variantId, l.quantity + 1);
                            refresh();
                          }}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="font-medium text-primary shrink-0">
                      PHP {(l.price * l.quantity).toLocaleString("en-PH")}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 pt-6 border-t border-surface-container-high space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Subtotal</span>
                <span>PHP {subtotal.toLocaleString("en-PH")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Tax (8.5%)</span>
                <span>PHP {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-headline font-bold text-lg pt-2">
                <span>Total</span>
                <span>PHP {total.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600 font-medium" role="alert">
                {error}
              </p>
            )}

            {pendingPayment && (
              <div
                className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-left"
                role="region"
                aria-label="Save your tracking link"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
                  Before you pay
                </p>
                <p className="text-sm text-on-surface-variant mb-3">
                  Save this page or copy your tracking link. After payment you
                  can return here without digging through email. Tracking updates
                  when your cart completes to an order after payment.
                </p>
                <p className="font-mono text-[11px] break-all text-primary mb-3">
                  {pendingPayment.trackingPageUrl}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => void copyTrackingLink()}
                    className="flex-1 py-3 rounded border border-primary text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-colors"
                  >
                    {copyDone ? "Copied" : "Copy tracking link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingPayment(null);
                      setCopyDone(false);
                      setError(null);
                    }}
                    className="flex-1 py-3 rounded border border-outline-variant text-on-surface-variant text-xs font-bold uppercase tracking-widest hover:border-error hover:text-error transition-colors"
                  >
                    Start over
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant mt-2">
                  Start over only if you are abandoning this checkout. Your
                  reserved stock may still expire per store policy.
                </p>
              </div>
            )}

            <button
              type="button"
              data-testid="checkout-submit-pay"
              disabled={
                lines.length === 0 || loading || Boolean(pendingPayment)
              }
              onClick={handlePay}
              className="w-full mt-6 py-4 bg-primary text-on-primary font-headline font-bold text-sm uppercase tracking-widest rounded hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? "Starting checkout…"
                : pendingPayment
                  ? "Checkout started: see above"
                  : "Continue to secure payment"}
            </button>

            {pendingPayment && (
              <button
                type="button"
                data-testid="checkout-continue-lemonsqueezy"
                onClick={continueToHostedCheckout}
                className="w-full mt-3 py-4 border-2 border-primary text-primary font-headline font-bold text-sm uppercase tracking-widest rounded hover:bg-primary hover:text-on-primary transition-all"
              >
                Open Lemon Squeezy checkout
              </button>
            )}

            <p className="text-xs text-on-surface-variant mt-4 text-center">
              One primary action on this screen. You can still adjust quantities
              above.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
