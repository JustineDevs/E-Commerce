import { CheckoutClient } from "./checkout-client";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string }>;
}) {
  const sp = await searchParams;
  const resume = sp.resume?.trim();
  return <CheckoutClient initialResumeCartId={resume} />;
}
