"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PUBLIC_SITE_ORIGIN, PH_VAT_RATE, computeDisplayVat } from "@apparel-commerce/sdk";
import {
  readCart,
  updateLineQuantity,
  clearCart,
  writeCart,
  type CartLine,
} from "@/lib/cart";
import { CheckoutTrustBadges } from "@/components/CheckoutTrustBadges";
import {
  startMedusaCheckout,
  PAYMENT_PROVIDER_IDS,
  PAYMENT_PROVIDER_LABELS,
  isEmbeddedProvider,
  type CodCartPayload,
  type PaymentProviderKey,
} from "@/lib/medusa-checkout";
import { getCheckoutPaymentAvailability } from "@/lib/checkout-payment-availability";
import { PaymentProviderLogo } from "@/components/PaymentProviderLogo";
import dynamic from "next/dynamic";

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

const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_PUBLIC_SITE_ORIGIN
).replace(/\/$/, "");

export function CheckoutClient({
  initialResumeCartId,
}: {
  initialResumeCartId?: string;
}) {
  const { data: session, status: authStatus } = useSession();
  const payInFlightRef = useRef(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentProviderKey>("STRIPE");
  const [pendingPayment, setPendingPayment] = useState<{
    checkoutUrl: string;
    trackingPageUrl: string;
    providerLabel: string;
    confirmedTotal: number;
    currencyCode: string;
    priceMismatch: boolean;
  } | null>(null);
  const [embeddedData, setEmbeddedData] = useState<{
    provider: "STRIPE" | "PAYPAL";
    stripeClientSecret?: string;
    paypalOrderId?: string;
    cartId: string;
    trackingPageUrl: string;
    confirmedTotal: number;
    currencyCode: string;
  } | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState("");
  const [hydrated, setHydrated] = useState(false);
  type ProfileGate = "idle" | "loading" | "complete" | "incomplete" | "error";
  const [profileGate, setProfileGate] = useState<ProfileGate>("idle");
  const [profileMissing, setProfileMissing] = useState<string[]>([]);

  const fetchProfileStatus = useCallback(async (): Promise<
    "complete" | "incomplete" | "error"
  > => {
    try {
      const res = await fetch("/api/account/profile/status", {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        complete?: boolean;
        missingFields?: string[];
      };
      if (!res.ok) return "error";
      setProfileMissing(
        Array.isArray(data.missingFields) ? data.missingFields : [],
      );
      return data.complete === true ? "complete" : "incomplete";
    } catch {
      return "error";
    }
  }, []);

  const { available: providerAvailable, preferredKey } = useMemo(
    () => getCheckoutPaymentAvailability(),
    [],
  );

  useEffect(() => {
    setPaymentMethod((prev) =>
      providerAvailable[prev] ? prev : preferredKey,
    );
  }, [providerAvailable, preferredKey]);

  useEffect(() => {
    if (authStatus !== "authenticated" || !session?.user) {
      setProfileGate("idle");
      setProfileMissing([]);
      return;
    }
    let cancelled = false;
    setProfileGate("loading");
    void (async () => {
      const outcome = await fetchProfileStatus();
      if (cancelled) return;
      setProfileGate(outcome === "error" ? "error" : outcome);
    })();
    return () => {
      cancelled = true;
    };
  }, [authStatus, session?.user, fetchProfileStatus]);

  useEffect(() => {
    if (profileGate !== "complete") return;
    const e = session?.user?.email?.trim();
    if (e) {
      setEmail((prev) => (prev.trim() === "" ? e : prev));
    }
  }, [profileGate, session?.user?.email]);

  const refresh = useCallback(() => {
    setLines(readCart());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const qs = initialResumeCartId?.trim()
        ? `?cartId=${encodeURIComponent(initialResumeCartId.trim())}`
        : "";
      const res = await fetch(`/api/cart/resume${qs}`);
      const data = (await res.json()) as { lines?: CartLine[] };
      if (cancelled) return;
      if (Array.isArray(data.lines) && data.lines.length > 0) {
        writeCart(data.lines);
        setLines(data.lines);
      } else {
        setLines(readCart());
      }
      setHydrated(true);
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [initialResumeCartId]);

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const tax = computeDisplayVat(subtotal);
  const total = Math.round((subtotal + tax) * 100) / 100;

  async function handlePay() {
    if (lines.length === 0 || payInFlightRef.current || !hydrated) return;
    if (profileGate !== "complete") {
      setError(
        "Add your delivery address and contact details before you continue to payment.",
      );
      return;
    }
    if (!providerAvailable[paymentMethod]) {
      setError("Choose an available way to pay, or ask the shop owner to turn on that option.");
      return;
    }
    payInFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const em = email.trim();
      if (
        em &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)
      ) {
        setError("Enter a valid email address or leave the field blank.");
        setLoading(false);
        payInFlightRef.current = false;
        return;
      }
      const lp = loyaltyPoints.trim();
      const parsedLoyalty =
        lp === "" ? undefined : Math.max(0, Math.floor(Number(lp)));

      let codCartPayload: CodCartPayload | undefined;
      if (paymentMethod === "COD") {
        const codRes = await fetch("/api/checkout/cod-cart-payload", {
          method: "POST",
        });
        const codJson = (await codRes.json()) as {
          error?: string;
          missingFields?: string[];
          email?: string;
          shipping_address?: unknown;
          billing_address?: unknown;
        };
        if (!codRes.ok) {
          const hint =
            Array.isArray(codJson.missingFields) && codJson.missingFields.length
              ? ` Add: ${codJson.missingFields.join(", ")}.`
              : "";
          setError(
            (codJson.error ??
              "Cash on delivery needs a complete delivery profile.") + hint,
          );
          setLoading(false);
          payInFlightRef.current = false;
          return;
        }
        if (
          typeof codJson.email !== "string" ||
          !codJson.shipping_address ||
          !codJson.billing_address
        ) {
          setError(
            "Could not load delivery details for cash on delivery. Update your account profile or pick another payment option.",
          );
          setLoading(false);
          payInFlightRef.current = false;
          return;
        }
        codCartPayload = codJson as CodCartPayload;
      }

      const result = await startMedusaCheckout({
        lines: lines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
        })),
        email: paymentMethod === "COD" ? undefined : em || undefined,
        providerId: PAYMENT_PROVIDER_IDS[paymentMethod],
        loyaltyPointsToRedeem:
          parsedLoyalty !== undefined && parsedLoyalty > 0
            ? parsedLoyalty
            : undefined,
        codCartPayload,
      });

      const {
        cartId,
        confirmedTotal,
        currencyCode,
        checkoutUrl,
        providerLabel,
        codOrderPlaced,
        orderId,
      } = result;

      await fetch("/api/cart/medusa-bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId }),
      });

      const trackId =
        codOrderPlaced && orderId?.trim() ? orderId.trim() : cartId;
      const res = await fetch("/api/tracking-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId: trackId }),
      });
      const data = (await res.json()) as { trackingPageUrl?: string };
      const trackingPageUrl =
        data.trackingPageUrl ??
        (SITE_ORIGIN
          ? `${SITE_ORIGIN}/track/${encodeURIComponent(trackId)}`
          : `/track/${encodeURIComponent(trackId)}`);

      if (codOrderPlaced && orderId?.trim()) {
        clearCart();
        window.location.href = trackingPageUrl;
        return;
      }

      if (isEmbeddedProvider(paymentMethod)) {
        const sessionData = result as Record<string, unknown> & typeof result;
        const stripeClientSecret =
          typeof sessionData.stripeClientSecret === "string"
            ? sessionData.stripeClientSecret
            : undefined;
        const paypalOrderId =
          typeof sessionData.paypalOrderId === "string"
            ? sessionData.paypalOrderId
            : undefined;

        setEmbeddedData({
          provider: paymentMethod as "STRIPE" | "PAYPAL",
          stripeClientSecret,
          paypalOrderId,
          cartId,
          trackingPageUrl,
          confirmedTotal,
          currencyCode,
        });
        setCopyDone(false);
      } else {
        const tol = Math.max(0.5, total * 0.02);
        const priceMismatch =
          Number.isFinite(confirmedTotal) &&
          Number.isFinite(total) &&
          Math.abs(confirmedTotal - total) > tol;

        setPendingPayment({
          checkoutUrl,
          trackingPageUrl,
          providerLabel,
          confirmedTotal,
          currencyCode,
          priceMismatch,
        });
        setCopyDone(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(false);
      payInFlightRef.current = false;
    }
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

  if (authStatus === "loading") {
    return (
      <main className="storefront-page-shell motion-surface max-w-4xl">
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
        Review your bag. Pick how you would like to pay. Totals are double-checked when you continue.
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
                            Not available for this shop right now.
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
              <p className="mt-3 text-xs leading-relaxed text-on-surface-variant rounded-lg border border-outline-variant/15 bg-surface-container-low/40 px-3 py-2">
                Cash on delivery uses your saved delivery address and the email on your account.
                Update them under Account if needed. Pay the rider in Philippine pesos when your order
                arrives.
              </p>
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
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded px-4 py-3 font-body text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-on-surface-variant mt-2">
              Defaults to your sign-in email. Change it if you want order updates somewhere else. We only check that the
              format looks correct.
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
              Your primary saved address from onboarding is on file. Hosted card or wallet steps may still ask you to confirm shipping for the payment provider.
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
                <span className="text-on-surface-variant">VAT ({(PH_VAT_RATE * 100).toFixed(0)}%)</span>
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
                      The amount above is what you will be charged. It may differ slightly from the
                      bag subtotal here if tax or prices were updated. Use this figure as the final
                      amount before you pay.
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
              embeddedData.stripeClientSecret && (
                <div className="mt-6 rounded-lg border border-outline-variant/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
                    Pay with your card
                  </p>
                  <StripeEmbeddedCheckout
                    clientSecret={embeddedData.stripeClientSecret}
                    returnUrl={embeddedData.trackingPageUrl}
                    onSuccess={() => {
                      clearCart();
                      window.location.href = embeddedData.trackingPageUrl;
                    }}
                    onError={(msg) => setError(msg)}
                  />
                </div>
              )}

            {embeddedData &&
              embeddedData.provider === "PAYPAL" &&
              embeddedData.paypalOrderId && (
                <div className="mt-6 rounded-lg border border-outline-variant/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
                    Pay with PayPal
                  </p>
                  <PayPalEmbeddedCheckout
                    paypalOrderId={embeddedData.paypalOrderId}
                    onApprove={() => {
                      clearCart();
                      window.location.href = embeddedData.trackingPageUrl;
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
                ? "Starting checkout…"
                : pendingPayment || embeddedData
                  ? "Checkout started: see above"
                  : "Continue to secure payment"}
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
              One primary action on this screen. You can still adjust quantities
              above.
            </p>

            <CheckoutTrustBadges />
          </div>
        </div>
      </div>
    </main>
  );
}
