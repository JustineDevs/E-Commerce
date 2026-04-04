"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const STORAGE_KEY = "payment_checkout_correlation_id";

async function resolveCorrelationId(
  paymentMethod: string,
): Promise<string | undefined> {
  let id = sessionStorage.getItem(STORAGE_KEY)?.trim();
  if (id) return id;
  const rec = await fetch(
    `/api/payments/checkout-intents/recover?provider=${encodeURIComponent(paymentMethod)}`,
    { credentials: "include" },
  );
  const recJson = (await rec.json().catch(() => ({}))) as {
    found?: boolean;
    correlationId?: string;
  };
  if (
    rec.ok &&
    recJson.found === true &&
    typeof recJson.correlationId === "string"
  ) {
    id = recJson.correlationId;
    try {
      sessionStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    return id;
  }
  return undefined;
}

function StripeReturnInner() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Payment received. Finalizing your order…");
  const [failed, setFailed] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    async function attempt(tryIndex: number): Promise<void> {
      if (cancelled.current) return;

      const correlationId = await resolveCorrelationId("stripe");

      if (correlationId) {
        const res = await fetch(
          `/api/payments/checkout-intents/${encodeURIComponent(correlationId)}/finalize`,
          { method: "POST", credentials: "include" },
        );
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          redirectUrl?: string;
        };
        if (cancelled.current) return;
        if (res.ok && typeof json.redirectUrl === "string" && json.redirectUrl.length > 0) {
          window.location.href = json.redirectUrl;
          return;
        }
        if (tryIndex < 12 && (res.status === 409 || res.status === 500)) {
          setMessage("Payment received. Waiting for confirmation, then we will finish your order…");
          await new Promise((r) => setTimeout(r, 1500));
          return attempt(tryIndex + 1);
        }
        setMessage(
          json.error ??
            "Your payment may still be processing. Check your email or open order tracking from your account in a few minutes.",
        );
        setFailed(true);
        return;
      }

      const res = await fetch("/api/checkout/complete-medusa-cart", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirectUrl?: string;
      };
      if (cancelled.current) return;
      if (res.ok && typeof json.redirectUrl === "string" && json.redirectUrl.length > 0) {
        window.location.href = json.redirectUrl;
        return;
      }
      if (tryIndex < 12 && (res.status === 409 || res.status === 500)) {
        setMessage("Payment received. Waiting for confirmation, then we will finish your order…");
        await new Promise((r) => setTimeout(r, 1500));
        return attempt(tryIndex + 1);
      }
      setMessage(
        json.error ??
          "Your payment may still be processing. Check your email or open order tracking from your account in a few minutes.",
      );
      setFailed(true);
    }

    const stripeSession = searchParams.get("stripe_session")?.trim();
    if (!stripeSession) {
      setMessage("Finalizing your order…");
    }

    void attempt(0);
    return () => {
      cancelled.current = true;
    };
  }, [searchParams]);

  return (
    <main className="storefront-page-shell motion-surface max-w-lg mx-auto text-center py-16 px-4">
      <h1 className="font-headline text-2xl font-bold text-primary mb-4">
        {failed ? "Almost there" : "Processing your order"}
      </h1>
      <p className="text-sm text-on-surface-variant leading-relaxed">{message}</p>
      {failed ? (
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/checkout"
            className="inline-flex items-center justify-center rounded bg-primary px-6 py-3 text-sm font-bold text-on-primary hover:opacity-90"
          >
            Back to checkout
          </Link>
          <Link
            href="/account"
            className="inline-flex items-center justify-center rounded border border-outline-variant px-6 py-3 text-sm font-medium text-primary hover:bg-surface-container-low"
          >
            My account
          </Link>
        </div>
      ) : null}
    </main>
  );
}

export default function StripeCheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="storefront-page-shell max-w-lg mx-auto py-16 px-4 text-center text-on-surface-variant text-sm">
          Loading…
        </main>
      }
    >
      <StripeReturnInner />
    </Suspense>
  );
}
