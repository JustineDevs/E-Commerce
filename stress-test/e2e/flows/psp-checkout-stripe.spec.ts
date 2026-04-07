import { test, expect } from "@playwright/test";
import {
  skipUnlessPspConfigured,
  navigateToShopAndAddFirstProduct,
  navigateToCheckout,
  fillCheckoutShippingInfo,
  selectPaymentProvider,
  expectOrderConfirmation,
  clickPayButton,
  payWithStripeSandboxCard,
  clickContinueToStripeHostedCheckout,
  fillStripeHostedCheckoutTestCard,
  STRIPE_SANDBOX_TEST_CARD_SUCCESS,
  STRIPE_SANDBOX_TEST_CARD_DECLINE,
} from "../helpers/checkout";

function shouldFailOnMissingPrereq(): boolean {
  return process.env.CI_STRICT_E2E === "1" || process.env.CI === "true";
}

/**
 * Stripe checkout flow E2E test.
 * Requires E2E_STRIPE_API_KEY env var with a Stripe test-mode key.
 *
 * Medusa uses Stripe Checkout (hosted) — the customer pays on checkout.stripe.com.
 * Incomplete Payment Intents in the Stripe Dashboard usually mean the hosted page was never completed.
 * Use Stripe test cards: https://docs.stripe.com/testing#cards (e.g. 4242424242424242).
 */
test.describe("Stripe checkout flow", () => {
  test.beforeEach(() => {
    skipUnlessPspConfigured("stripe");
  });

  test("complete checkout with Stripe test card", async ({ page }) => {
    await navigateToShopAndAddFirstProduct(page);
    await navigateToCheckout(page);
    await fillCheckoutShippingInfo(page);

    const selected = await selectPaymentProvider(page, "stripe");
    if (!selected) {
      if (shouldFailOnMissingPrereq()) {
        throw new Error("Stripe payment option is not visible during strict E2E validation.");
      }
      test.skip(true, "Stripe payment option not visible on checkout page");
      return;
    }

    await payWithStripeSandboxCard(page, STRIPE_SANDBOX_TEST_CARD_SUCCESS);
    await expectOrderConfirmation(page);
  });

  test("Stripe checkout handles declined card", async ({ page }) => {
    await navigateToShopAndAddFirstProduct(page);
    await navigateToCheckout(page);
    await fillCheckoutShippingInfo(page);

    const selected = await selectPaymentProvider(page, "stripe");
    if (!selected) {
      if (shouldFailOnMissingPrereq()) {
        throw new Error("Stripe payment option is not visible during strict E2E validation.");
      }
      test.skip(true, "Stripe payment option not visible on checkout page");
      return;
    }

    await clickPayButton(page);
    await clickContinueToStripeHostedCheckout(page);
    await fillStripeHostedCheckoutTestCard(page, STRIPE_SANDBOX_TEST_CARD_DECLINE);
    const pay = page
      .getByTestId("hosted-payment-submit-button")
      .or(page.getByRole("button", { name: /^pay\b/i }))
      .first();
    await pay.click();

    await expect(
      page.getByText(/declined|your card was declined|card.*declined/i).first(),
    ).toBeVisible({ timeout: 45_000 });
  });
});
