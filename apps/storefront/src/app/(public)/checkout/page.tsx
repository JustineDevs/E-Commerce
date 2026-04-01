import { CheckoutClient } from "./checkout-client";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string; stripe_cancel?: string }>;
}) {
  const sp = await searchParams;
  const resume = sp.resume?.trim();
  const stripeCancel =
    sp.stripe_cancel === "1" ||
    sp.stripe_cancel === "true" ||
    sp.stripe_cancel === "yes";
  return (
    <CheckoutClient initialResumeCartId={resume} initialStripeCheckoutCancel={stripeCancel} />
  );
}
