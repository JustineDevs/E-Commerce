"use client";

import Link from "next/link";
import {
  PAYMENT_PROVIDER_IDS,
  PAYMENT_PROVIDER_LABELS,
  type PaymentProviderKey,
} from "@/lib/medusa-checkout";
import { updateLineQuantity } from "@/lib/cart";
import { CheckoutTrustBadges } from "@/components/CheckoutTrustBadges";
import { PaymentProviderLogo } from "@/components/PaymentProviderLogo";
import dynamic from "next/dynamic";
import { formatCheckoutMoney } from "./checkout-utils";
import { useCheckoutClient } from "./use-checkout-client";

const StripeEmbeddedCheckout = dynamic(
  () =>
    import("@/components/StripeEmbeddedCheckout").then(
      (m) => m.StripeEmbeddedCheckout,
    ),
  { ssr: false },
);

const PayPalEmbeddedCheckout = dynamic(
  () =>
    import("@/components/PayPalEmbeddedCheckout").then(
      (m) => m.PayPalEmbeddedCheckout,
    ),
  { ssr: false },
);

export function CheckoutClient({
  initialResumeCartId,
  initialStripeCheckoutCancel,
}: {
  initialResumeCartId?: string;
  initialStripeCheckoutCancel?: boolean;
}) {
  const {
    session,
    authStatus,
    lines,
    email,
    setEmail,
    error,
    setError,
    loading,
    paymentMethod,
    setPaymentMethod,
    pendingPayment,
    setPendingPayment,
    embeddedData,
    copyDone,
    setCopyDone,
    loyaltyPoints,
    setLoyaltyPoints,
    hydrated,
    medusaPricePreview,
    medusaPriceStatus,
    profileGate,
    setProfileGate,
    profileMissing,
    fetchProfileStatus,
    providerAvailable,
    refresh,
    localSubtotal,
    localTax,
    localTotal,
    useMedusaBagTotals,
    displayCurrency,
    handlePay,
    completeEmbeddedPayment,
    continueToHostedCheckout,
    copyTrackingLink,
    phVatRate,
  } = useCheckoutClient({ initialResumeCartId, initialStripeCheckoutCancel });

  if (authStatus === "loading") {
    return (
      <main className="storefront-page-shell motion-surface max-w-4xl">
        <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary mb-2">
          Checkout
        </h1>
        <p className="text-sm text-on-surface-variant">Loading…</p>
      </main>
    );
  }

  if (authStatus !== "authenticated" || !session?.user) {
    return (
      <main className="storefront-page-shell motion-surface max-w-4xl">
        <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary mb-2">
          Checkout
        </h1>
        <p className="font-body text-on-surface-variant mb-6 max-w-lg">
          Sign in to review your bag and place an order. This keeps your purchases and delivery details
          tied to your account.
        </p>
        <Link
          href={`/sign-in?callbackUrl=${encodeURIComponent("/checkout")}`}
          data-testid="checkout-guest-sign-in"
          className="inline-flex rounded bg-primary px-6 py-3 text-sm font-bold text-on-primary hover:opacity-90"
        >
          Sign in to continue
        </Link>
      </main>
    );
  }

  if (profileGate === "loading" || profileGate === "idle") {
    return (
      <main className="storefront-page-shell motion-surface max-w-4xl">
        <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary mb-2">
          Checkout
        </h1>
        <p className="text-sm text-on-surface-variant">Loading your profile…</p>
      </main>
    );
  }

  if (profileGate === "error") {
    return (
      <main className="storefront-page-shell motion-surface max-w-4xl">
        <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary mb-2">
          Checkout
        </h1>
        <p className="font-body text-on-surface-variant mb-6 max-w-lg">
          We could not confirm your delivery profile. Check your connection and try again.
        </p>
        <button
          type="button"
          data-testid="checkout-profile-retry"
          className="inline-flex rounded bg-primary px-6 py-3 text-sm font-bold text-on-primary hover:opacity-90"
          onClick={() => {
            setProfileGate("loading");
            void fetchProfileStatus().then((outcome) => {
              setProfileGate(outcome === "error" ? "error" : outcome);
            });
          }}
        >
          Retry
        </button>
      </main>
    );
  }

  if (profileGate === "incomplete") {
    const onboardingHref = `/onboarding?next=${encodeURIComponent("/checkout")}`;
    return (
      <main className="storefront-page-shell motion-surface max-w-4xl">
        <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary mb-2">
          Checkout
        </h1>
        <p className="font-body text-on-surface-variant mb-4 max-w-lg">
          Add your name, mobile number, and delivery address before you pay. You will return here when you are done.
        </p>
        {profileMissing.length > 0 ? (
          <ul className="mb-6 list-disc pl-5 text-sm text-on-surface-variant max-w-lg space-y-1">
            {profileMissing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : null}
        <Link
          href={onboardingHref}
          data-testid="checkout-onboarding-continue"
          className="inline-flex rounded bg-primary px-6 py-3 text-sm font-bold text-on-primary hover:opacity-90"
        >
          Complete delivery details
        </Link>
      </main>
    );
  }

  return (
    <main className="storefront-page-shell motion-surface max-w-4xl">
      <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-primary mb-2">
        Checkout
      </h1>
      <p className="font-body text-on-surface-variant mb-4 max-w-lg">
        Review your bag and choose how to pay. We confirm the final total when you continue. For debit or
        credit card, you will continue to a secure Stripe checkout page to enter your card. For PayPal,
        GCash, or PayMaya, we send you to that provider&apos;s secure checkout when you continue. Cash on
        delivery places your order here with no card step.
      </p>
      <p className="font-body text-sm text-on-surface-variant mb-12 max-w-lg rounded-lg border border-outline-variant/15 bg-surface-container-low/40 px-4 py-3">
        <span className="font-headline text-[10px] font-bold uppercase tracking-widest text-primary">
          Before you pay
        </span>
          <span className="mt-2 block leading-relaxed">
          You will see the full amount before you pay, get a link to follow your order, and can ship
          nationwide. Your saved delivery address is used for fulfillment. Adjust the email below if you want receipts sent somewhere other than your sign-in address.
        </span>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section>
            <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-4">
              How you will pay
            </h2>
            <div
              className="space-y-3"
              role="radiogroup"
              aria-label="How you will pay"
            >
              {(Object.keys(PAYMENT_PROVIDER_IDS) as PaymentProviderKey[]).map(
                (key) => {
                  const ok = providerAvailable[key];
                  const selected = paymentMethod === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-disabled={!ok}
                      data-testid={`payment-${key.toLowerCase()}`}
                      disabled={!ok}
                      onClick={() => ok && setPaymentMethod(key)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                        ok
                          ? "cursor-pointer border-outline-variant/20 hover:border-primary/25 hover:bg-surface-container-low/60"
                          : "cursor-not-allowed border-outline-variant/10 opacity-60"
                      } ${selected && ok ? "border-primary/40 bg-surface-container-low/40 ring-1 ring-primary/15" : ""}`}
                    >
                      <PaymentProviderLogo
                        providerKey={key}
                        label={PAYMENT_PROVIDER_LABELS[key]}
                      />
                      <span className="min-w-0 flex-1 text-sm leading-snug">
                        {PAYMENT_PROVIDER_LABELS[key]}
                        {!ok ? (
                          <span className="mt-0.5 block text-xs text-on-surface-variant">
                            Not available for your area or store setup right now.
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                          selected && ok
                            ? "bg-primary"
                            : "bg-outline-variant/35"
                        }`}
                        aria-hidden
                      >
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                            selected && ok
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </span>
                    </button>
                  );
                },
              )}
            </div>
            {paymentMethod === "COD" ? (
              <div
                className="mt-3 space-y-2 rounded-lg border border-outline-variant/15 bg-surface-container-low/40 px-3 py-3 text-xs leading-relaxed text-on-surface-variant"
                role="region"
                aria-label="Cash on delivery steps"
              >
                <p className="font-semibold text-on-surface">How cash on delivery works</p>
                <ol className="list-decimal space-y-1.5 pl-4 text-on-surface-variant">
                  <li>
                    Confirm your bag and delivery profile (address and phone from onboarding). Update them under
                    Account if anything is wrong.
                  </li>
                  <li>
                    Choose cash on delivery here, then use the button below to place the order. No card or wallet step
                    runs for this option.
                  </li>
                  <li>
                    After you submit, you go to the order tracking page. We use the email on your account for order
                    updates.
                  </li>
                  <li>
                    When the rider arrives, pay in Philippine pesos for the total shown on your confirmation. Keep
                    mobile contact details handy in case the courier calls.
                  </li>
                </ol>
              </div>
            ) : null}
          </section>

          <section>
            <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-4">
              Stay in touch
            </h2>
            <label className="block text-xs font-medium text-on-surface-variant mb-2">
              Email for your receipt
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={paymentMethod === "COD"}
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-4 py-3 font-body text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-on-surface-variant mt-2">
              {paymentMethod === "COD" ? (
                <>
                  Cash on delivery uses the email on your account for confirmations. Switch payment method if you need
                  to type a different address here.
                </>
              ) : (
                <>
                  Defaults to your sign-in email. Change it if you want order updates somewhere else. We only check
                  that the format looks correct.
                </>
              )}
            </p>
            <label className="block text-xs font-medium text-on-surface-variant mt-4 mb-2">
              Loyalty points to use (optional)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={loyaltyPoints}
              onChange={(e) => setLoyaltyPoints(e.target.value)}
              placeholder="0"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-4 py-3 font-body text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-on-surface-variant mt-2">
              Each point lowers your total by 1.00 in the shop currency. Your balance is checked
              before payment.
            </p>
          </section>

          <section>
            <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-4">
              Delivery and pickup
            </h2>
            <p className="text-sm text-on-surface-variant">
              Your primary saved address from onboarding is on file.
              {paymentMethod === "COD"
                ? " Cash on delivery ships to that address."
                : " Some payment methods may ask you to confirm shipping or contact details before you pay."}
            </p>
            <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
              <strong className="text-primary">Buy online, pick up in store:</strong>{" "}
              When your order supports it, choose store pickup on the payment or
              delivery step, or write &quot;Cavite pickup&quot; in order comments
              and confirm with support if you do not see pickup.
            </p>
          </section>
        </div>

        <div>
          <div className="bg-surface-container-lowest rounded-lg shadow-[0px_20px_40px_rgba(0,0,0,0.02)] p-6 border border-outline-variant/10">
            <h2 className="font-headline text-sm font-bold uppercase tracking-widest text-primary mb-6">
              Your bag
            </h2>

            {!hydrated ? (
              <p className="text-on-surface-variant text-sm py-8 text-center">
                Loading your bag…
              </p>
            ) : lines.length === 0 ? (
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
                        {l.size} / {l.color}
                        {l.sku ? (
                          <span className="text-on-surface-variant/80"> · Ref. {l.sku}</span>
                        ) : null}
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
                      {formatCheckoutMoney(
                        (() => {
                          const fromMedusa =
                            medusaPricePreview?.lineSubtotalsByVariantId[
                              l.variantId
                            ];
                          if (
                            useMedusaBagTotals &&
                            fromMedusa != null &&
                            Number.isFinite(fromMedusa)
                          ) {
                            return fromMedusa;
                          }
                          return l.price * l.quantity;
                        })(),
                        displayCurrency,
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 pt-6 border-t border-surface-container-high space-y-2">
              {medusaPriceStatus === "loading" && lines.length > 0 ? (
                <p className="text-xs text-on-surface-variant mb-2">
                  Updating totals with shipping and catalog prices…
                </p>
              ) : null}
              {medusaPriceStatus === "error" && lines.length > 0 ? (
                <p className="text-xs text-amber-800 mb-2" role="status">
                  Live totals are unavailable. Figures below omit shipping and use your bag prices only. Refresh the page or try again.
                </p>
              ) : null}
              {useMedusaBagTotals && medusaPricePreview ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Subtotal</span>
                    <span>
                      {formatCheckoutMoney(
                        medusaPricePreview.subtotal,
                        displayCurrency,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Shipping</span>
                    <span>
                      {formatCheckoutMoney(
                        medusaPricePreview.shippingTotal,
                        displayCurrency,
                      )}
                    </span>
                  </div>
                  {medusaPricePreview.taxTotal > 0 ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Tax</span>
                      <span>
                        {formatCheckoutMoney(
                          medusaPricePreview.taxTotal,
                          displayCurrency,
                        )}
                      </span>
                    </div>
                  ) : null}
                  {medusaPricePreview.discountTotal > 0 ? (
                    <div className="flex justify-between text-sm text-green-800">
                      <span>Discount</span>
                      <span>
                        −
                        {formatCheckoutMoney(
                          medusaPricePreview.discountTotal,
                          displayCurrency,
                        )}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-headline font-bold text-lg pt-2">
                    <span>Total</span>
                    <span>
                      {formatCheckoutMoney(
                        medusaPricePreview.total,
                        displayCurrency,
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Subtotal</span>
                    <span>
                      {formatCheckoutMoney(localSubtotal, displayCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">
                      VAT ({(phVatRate * 100).toFixed(0)}%)
                    </span>
                    <span>
                      {formatCheckoutMoney(localTax, displayCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between font-headline font-bold text-lg pt-2">
                    <span>Total</span>
                    <span>
                      {formatCheckoutMoney(localTotal, displayCurrency)}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant pt-1 leading-relaxed">
                    Shipping is added when you continue; the total above is before delivery.
                  </p>
                </>
              )}
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
                  Save this page or copy your tracking link so you can find your order after you pay on the
                  next screen. Your order status updates once payment succeeds.
                </p>
                <p className="font-mono text-[11px] break-all text-primary mb-3">
                  {pendingPayment.trackingPageUrl}
                </p>
                <div className="mb-3 rounded border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
                    Amount due
                  </p>
                  <p className="font-headline font-bold text-lg text-on-surface">
                    {pendingPayment.currencyCode}{" "}
                    {pendingPayment.confirmedTotal.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  {pendingPayment.priceMismatch ? (
                    <p className="mt-2 text-xs text-amber-800" role="status">
                      The amount above is what the payment provider will charge. If it differs from the
                      bag, the catalog or taxes changed between preview and continue. Use the amount
                      due as final.
                    </p>
                  ) : null}
                </div>
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

            {embeddedData &&
              embeddedData.provider === "STRIPE" &&
              embeddedData.stripeClientSecret &&
              paymentMethod === "STRIPE" && (
                <div className="mt-6 rounded-lg border border-outline-variant/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
                    Pay with your card
                  </p>
                  <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                    Enter your card in the secure form below. Your full card number is processed by our
                    payment partner and is not stored on this shop&apos;s servers.
                  </p>
                  <StripeEmbeddedCheckout
                    clientSecret={embeddedData.stripeClientSecret}
                    returnUrl={embeddedData.trackingPageUrl}
                    onSuccess={() => {
                      void completeEmbeddedPayment(embeddedData);
                    }}
                    onError={(msg) => setError(msg)}
                  />
                </div>
              )}

            {embeddedData &&
              embeddedData.provider === "PAYPAL" &&
              embeddedData.paypalOrderId &&
              paymentMethod === "PAYPAL" && (
                <div className="mt-6 rounded-lg border border-outline-variant/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
                    Pay with PayPal
                  </p>
                  <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
                    Sign in to PayPal or pay as a guest in the secure area below.
                  </p>
                  <PayPalEmbeddedCheckout
                    paypalOrderId={embeddedData.paypalOrderId}
                    onApprove={() => {
                      void completeEmbeddedPayment(embeddedData);
                    }}
                    onError={(msg) => setError(msg)}
                  />
                </div>
              )}

            <button
              type="button"
              data-testid="checkout-submit-pay"
              disabled={
                !hydrated ||
                lines.length === 0 ||
                loading ||
                Boolean(pendingPayment) ||
                Boolean(embeddedData)
              }
              onClick={handlePay}
              className="w-full mt-6 py-4 bg-primary text-on-primary font-headline font-bold text-sm uppercase tracking-widest rounded hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? paymentMethod === "COD"
                  ? "Placing your order…"
                  : "Starting checkout…"
                : pendingPayment || embeddedData
                  ? "Next step above"
                  : paymentMethod === "COD"
                    ? "Place order (pay on delivery)"
                    : "Continue to payment"}
            </button>

            {pendingPayment && (
              <button
                type="button"
                data-testid="checkout-continue-payment"
                onClick={continueToHostedCheckout}
                className="w-full mt-3 py-4 border-2 border-primary text-primary font-headline font-bold text-sm uppercase tracking-widest rounded hover:bg-primary hover:text-on-primary transition-all"
              >
                Continue to {pendingPayment.providerLabel}
              </button>
            )}

            <p className="text-xs text-on-surface-variant mt-4 text-center">
              {paymentMethod === "COD" && !embeddedData && !pendingPayment ? (
                <>Choose cash on delivery on the left, then place your order here. You can change quantities above.</>
              ) : (
                <>Follow the prompts above after you continue. You can still change quantities in your bag.</>
              )}
            </p>

            <CheckoutTrustBadges />
          </div>
        </div>
      </div>
    </main>
  );
}
