"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const STORAGE_KEY = "payment_checkout_correlation_id";

function checkoutReviewHref(message: string): string {
  return `/checkout?review=1&message=${encodeURIComponent(message)}`;
}

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

const POLL_MS = 2000;
const POLL_MAX = 20;

function StripeReturnInner() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState(
    "Payment received. Finalizing your order…",
  );
  const [failed, setFailed] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    async function run(): Promise<void> {
      const correlationId = await resolveCorrelationId("stripe");

      if (correlationId) {
        const finalizeOnce = await fetch(
          `/api/payments/checkout-intents/${encodeURIComponent(correlationId)}/finalize`,
          { method: "POST", credentials: "include" },
        );
        const finalizeJson = (await finalizeOnce.json().catch(() => ({}))) as {
          error?: string;
          redirectUrl?: string;
        };
        if (cancelled.current) return;
        if (
          finalizeOnce.status === 409 &&
          typeof finalizeJson.error === "string" &&
          finalizeJson.error.trim()
        ) {
          const msg = finalizeJson.error.trim();
          window.location.href = checkoutReviewHref(msg);
          return;
        }
        if (
          finalizeOnce.ok &&
          typeof finalizeJson.redirectUrl === "string" &&
          finalizeJson.redirectUrl.length > 0
        ) {
          window.location.href = finalizeJson.redirectUrl;
          return;
        }

        setMessage(
          "Confirming payment with our servers. You can leave this page; your order will update in your account.",
        );

        for (let i = 0; i < POLL_MAX; i++) {
          if (cancelled.current) return;
          await new Promise((r) => setTimeout(r, POLL_MS));
          const st = await fetch(
            `/api/payments/checkout-intents/${encodeURIComponent(correlationId)}`,
            { credentials: "include" },
          );
          const stJson = (await st.json().catch(() => ({}))) as {
            status?: string;
            medusaOrderId?: string | null;
            staleReason?: string | null;
            lastError?: string | null;
          };
          if (cancelled.current) return;
          if (
            st.ok &&
            stJson.status === "completed" &&
            typeof stJson.medusaOrderId === "string" &&
            stJson.medusaOrderId
          ) {
            window.location.href = `/track/${encodeURIComponent(stJson.medusaOrderId)}`;
            return;
          }
          if (
            st.ok &&
            (stJson.status === "expired" || stJson.status === "needs_review") &&
            typeof (stJson.staleReason ?? stJson.lastError) === "string" &&
            (stJson.staleReason ?? stJson.lastError)!.trim().length > 0
          ) {
            window.location.href = checkoutReviewHref(
              (stJson.staleReason ?? stJson.lastError ?? "Review your updated total before paying again.").trim(),
            );
            return;
          }
        }

        setMessage(
          finalizeJson.error ??
            "Your payment may still be processing. Open your account or order tracking in a few minutes.",
        );
        setFailed(true);
        return;
      }

      const res = await fetch("/api/checkout/complete-medusa-cart", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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
      if (!res.ok && res.status >= 500) {
        const retry = await fetch("/api/checkout/complete-medusa-cart", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const retryJson = (await retry.json().catch(() => ({}))) as {
          redirectUrl?: string;
        };
        if (
          cancelled.current ||
          (retry.ok &&
            typeof retryJson.redirectUrl === "string" &&
            retryJson.redirectUrl.length > 0)
        ) {
          if (retry.ok && retryJson.redirectUrl) {
            window.location.href = retryJson.redirectUrl;
          }
          return;
        }
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

    void run();
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
