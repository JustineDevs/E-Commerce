"use client";

import { useCallback, useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe as StripeType, type StripeElementsOptions } from "@stripe/stripe-js";

let stripePromise: Promise<StripeType | null> | null = null;

function getStripe(): Promise<StripeType | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}

function StripeForm({
  onSuccess,
  onError,
  returnUrl,
}: {
  onSuccess: () => void;
  onError: (_msg: string) => void;
  returnUrl: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!stripe || !elements) return;

      setLoading(true);
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message ?? "Payment failed.");
        setLoading(false);
      } else {
        onSuccess();
      }
    },
    [stripe, elements, returnUrl, onSuccess, onError],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{ layout: "tabs" }}
      />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-4 bg-primary text-on-primary font-headline font-bold text-sm uppercase tracking-widest rounded hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Processing…" : "Pay with Stripe"}
      </button>
    </form>
  );
}

export function StripeEmbeddedCheckout({
  clientSecret,
  returnUrl,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  returnUrl: string;
  onSuccess: () => void;
  onError: (_msg: string) => void;
}) {
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#1a1a1a",
        fontFamily: "system-ui, sans-serif",
        borderRadius: "6px",
      },
    },
  };

  return (
    <Elements stripe={getStripe()} options={options}>
      <StripeForm
        returnUrl={returnUrl}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
