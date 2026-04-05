"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PH_VAT_RATE, computeDisplayVat } from "@apparel-commerce/sdk";
import {
  readCart,
  clearCart,
  writeCart,
  type CartLine,
} from "@/lib/cart";
import {
  previewMedusaCheckoutTotals,
  startMedusaCheckout,
  PAYMENT_PROVIDER_IDS,
  type CodCartPayload,
  type MedusaCheckoutTotalsPreview,
  type PaymentProviderKey,
} from "@/lib/medusa-checkout";
import { resolveCheckoutPaymentAvailability } from "@/lib/checkout-payment-availability";
import { minorUnitDivisor } from "@/lib/medusa-money";
import { CHECKOUT_SITE_ORIGIN } from "./checkout-utils";

export type CheckoutPendingPayment = {
  checkoutUrl: string;
  trackingPageUrl: string;
  providerLabel: string;
  confirmedTotal: number;
  currencyCode: string;
  priceMismatch: boolean;
  correlationId?: string;
};

export type CheckoutEmbeddedData = {
  provider: "STRIPE" | "PAYPAL";
  stripeClientSecret?: string;
  paypalOrderId?: string;
  cartId: string;
  trackingPageUrl: string;
  confirmedTotal: number;
  currencyCode: string;
  correlationId: string;
};

type ProfileGate = "idle" | "loading" | "complete" | "incomplete" | "error";
const FINALIZE_POLL_MS = 2_000;
const FINALIZE_POLL_MAX = 20;

export function useCheckoutClient({
  initialResumeCartId,
  initialStripeCheckoutCancel,
}: {
  initialResumeCartId?: string;
  initialStripeCheckoutCancel?: boolean;
}) {
  const { data: session, status: authStatus } = useSession();
  const payInFlightRef = useRef(false);
  const medusaPreviewSeqRef = useRef(0);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentProviderKey>("STRIPE");
  const [pendingPayment, setPendingPayment] = useState<CheckoutPendingPayment | null>(null);
  const [embeddedData, setEmbeddedData] = useState<CheckoutEmbeddedData | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [medusaPricePreview, setMedusaPricePreview] =
    useState<MedusaCheckoutTotalsPreview | null>(null);
  const [medusaPriceStatus, setMedusaPriceStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
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

  const [payAvailability, setPayAvailability] = useState(() =>
    resolveCheckoutPaymentAvailability(undefined),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/checkout/available-payment-methods", {
          cache: "no-store",
        });
        const j = (await res.json()) as {
          ok?: boolean;
          keys?: string[];
        };
        if (cancelled) return;
        if (j.ok === true && Array.isArray(j.keys) && j.keys.length > 0) {
          const allowed = new Set(j.keys);
          const valid = (Object.keys(PAYMENT_PROVIDER_IDS) as PaymentProviderKey[]).filter(
            (k) => allowed.has(k),
          );
          if (valid.length > 0) {
            setPayAvailability(resolveCheckoutPaymentAvailability(valid));
          }
        }
      } catch {
        /* keep env fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const providerAvailable = payAvailability.available;
  const preferredKey = payAvailability.preferredKey;

  useEffect(() => {
    setPaymentMethod((prev) =>
      providerAvailable[prev] ? prev : preferredKey,
    );
  }, [providerAvailable, preferredKey]);

  const paymentMethodChangeSkipRef = useRef(true);
  useEffect(() => {
    if (paymentMethodChangeSkipRef.current) {
      paymentMethodChangeSkipRef.current = false;
      return;
    }
    setPendingPayment(null);
    setEmbeddedData(null);
    setCopyDone(false);
    setError(null);
  }, [paymentMethod]);

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

  useEffect(() => {
    if (initialStripeCheckoutCancel) {
      setError(
        "You left the card checkout before paying. Your bag is unchanged. Choose a payment method and continue when you are ready.",
      );
    }
  }, [initialStripeCheckoutCancel]);

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

  const checkoutLinesSignature = useMemo(
    () => lines.map((l) => `${l.variantId}:${l.quantity}`).join("|"),
    [lines],
  );

  useEffect(() => {
    if (profileGate !== "complete" || !hydrated || lines.length === 0) {
      setMedusaPricePreview(null);
      setMedusaPriceStatus("idle");
      return;
    }

    setMedusaPriceStatus("loading");
    const seq = ++medusaPreviewSeqRef.current;
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const lp = loyaltyPoints.trim();
          const parsedLoyalty =
            lp === "" ? undefined : Math.max(0, Math.floor(Number(lp)));

          const preview = await previewMedusaCheckoutTotals({
            lines: lines.map((l) => ({
              variantId: l.variantId,
              quantity: l.quantity,
            })),
            email:
              paymentMethod === "COD" ? undefined : email.trim() || undefined,
            loyaltyPointsToRedeem:
              parsedLoyalty !== undefined && parsedLoyalty > 0
                ? parsedLoyalty
                : undefined,
            paymentMethod,
          });
          if (!cancelled && seq === medusaPreviewSeqRef.current) {
            setMedusaPricePreview(preview);
            setMedusaPriceStatus("ready");
          }
        } catch {
          if (!cancelled && seq === medusaPreviewSeqRef.current) {
            setMedusaPricePreview(null);
            setMedusaPriceStatus("error");
          }
        }
      })();
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    profileGate,
    hydrated,
    checkoutLinesSignature,
    loyaltyPoints,
    email,
    paymentMethod,
  ]);

  const localSubtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const localTax = computeDisplayVat(localSubtotal);
  const localTotal = Math.round((localSubtotal + localTax) * 100) / 100;

  const useMedusaBagTotals =
    medusaPriceStatus === "ready" && medusaPricePreview != null;
  const displayCurrency = useMedusaBagTotals
    ? medusaPricePreview.currencyCode
    : "PHP";

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
        paymentMethod !== "COD" &&
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
        (CHECKOUT_SITE_ORIGIN
          ? `${CHECKOUT_SITE_ORIGIN}/track/${encodeURIComponent(trackId)}`
          : `/track/${encodeURIComponent(trackId)}`);

      if (codOrderPlaced && orderId?.trim()) {
        clearCart();
        window.location.href = trackingPageUrl;
        return;
      }

      const sessionData = result as Record<string, unknown> & typeof result;
      const stripeClientSecret =
        typeof sessionData.stripeClientSecret === "string"
          ? sessionData.stripeClientSecret
          : undefined;
      const paypalOrderId =
        typeof sessionData.paypalOrderId === "string"
          ? sessionData.paypalOrderId
          : undefined;
      const useStripeElement = paymentMethod === "STRIPE" && Boolean(stripeClientSecret);
      const usePayPalElement = paymentMethod === "PAYPAL" && Boolean(paypalOrderId);
      const providerKey = paymentMethod.toLowerCase();
      const amountMinor = Math.round(
        confirmedTotal * minorUnitDivisor(currencyCode),
      );
      let checkoutCorrelationId: string | undefined;
      try {
        const regRes = await fetch("/api/payments/checkout-intents", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: providerKey,
            amountMinor,
            currencyCode,
            providerSessionId: paypalOrderId,
          }),
        });
        const regJson = (await regRes.json().catch(() => ({}))) as {
          correlationId?: string;
        };
        if (regRes.ok && typeof regJson.correlationId === "string") {
          checkoutCorrelationId = regJson.correlationId;
        }
      } catch {
        checkoutCorrelationId = undefined;
      }

      if (useStripeElement || usePayPalElement) {
        if (!checkoutCorrelationId) {
          throw new Error(
            "Could not register a durable payment attempt for this checkout. Try again before entering payment details.",
          );
        }
        setEmbeddedData({
          provider: useStripeElement ? "STRIPE" : "PAYPAL",
          stripeClientSecret,
          paypalOrderId,
          cartId,
          trackingPageUrl,
          confirmedTotal,
          currencyCode,
          correlationId: checkoutCorrelationId,
        });
        setCopyDone(false);
      } else {
        const comparableBagTotal =
          medusaPricePreview?.total ?? localTotal;
        const tol = Math.max(0.5, comparableBagTotal * 0.02);
        const priceMismatch =
          Number.isFinite(confirmedTotal) &&
          Number.isFinite(comparableBagTotal) &&
          Math.abs(confirmedTotal - comparableBagTotal) > tol;

        setPendingPayment({
          checkoutUrl,
          trackingPageUrl,
          providerLabel,
          confirmedTotal,
          currencyCode,
          priceMismatch,
          correlationId: checkoutCorrelationId,
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
    if (pendingPayment.correlationId) {
      try {
        sessionStorage.setItem(
          "payment_checkout_correlation_id",
          pendingPayment.correlationId,
        );
      } catch {
        /* ignore */
      }
    }
    clearCart();
    window.location.href = pendingPayment.checkoutUrl;
  }

  async function completeEmbeddedPayment(active: CheckoutEmbeddedData): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const finalizeRes = await fetch(
        `/api/payments/checkout-intents/${encodeURIComponent(active.correlationId)}/finalize`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const finalizeJson = (await finalizeRes.json().catch(() => ({}))) as {
        error?: string;
        redirectUrl?: string;
      };
      if (
        finalizeRes.ok &&
        typeof finalizeJson.redirectUrl === "string" &&
        finalizeJson.redirectUrl.length > 0
      ) {
        clearCart();
        window.location.href = finalizeJson.redirectUrl;
        return;
      }

      for (let attempt = 0; attempt < FINALIZE_POLL_MAX; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, FINALIZE_POLL_MS));
        const statusRes = await fetch(
          `/api/payments/checkout-intents/${encodeURIComponent(active.correlationId)}`,
          { credentials: "include" },
        );
        const statusJson = (await statusRes.json().catch(() => ({}))) as {
          status?: string;
          medusaOrderId?: string | null;
          lastError?: string | null;
        };
        if (
          statusRes.ok &&
          statusJson.status === "completed" &&
          typeof statusJson.medusaOrderId === "string" &&
          statusJson.medusaOrderId.length > 0
        ) {
          clearCart();
          window.location.href = `/track/${encodeURIComponent(statusJson.medusaOrderId)}`;
          return;
        }
        if (
          statusRes.ok &&
          statusJson.status === "needs_review" &&
          typeof statusJson.lastError === "string" &&
          statusJson.lastError.length > 0
        ) {
          throw new Error(statusJson.lastError);
        }
      }

      throw new Error(
        finalizeJson.error ??
          "Payment was accepted, but order finalization is still pending. Use your tracking link to resume safely.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Payment completed, but order finalization could not be confirmed yet.",
      );
    } finally {
      setLoading(false);
    }
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

  return {
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
    phVatRate: PH_VAT_RATE,
  };
}
