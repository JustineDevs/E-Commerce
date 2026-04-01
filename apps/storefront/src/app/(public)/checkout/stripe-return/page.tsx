"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

function StripeReturnInner() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Confirming your payment…");
  const [failed, setFailed] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    const stripeSession = searchParams.get("stripe_session")?.trim();
    if (!stripeSession) {
      setMessage("This return link is missing payment details. Go back to checkout and try again.");
      setFailed(true);
      return;
    }

    async function attempt(tryIndex: number): Promise<void> {
      if (cancelled.current) return;
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
        await new Promise((r) => setTimeout(r, 1500));
        return attempt(tryIndex + 1);
      }
      setMessage(
        json.error ??
          "Your payment may still be processing. Check your email or open order tracking from your account in a few minutes.",
      );
      setFailed(true);
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
