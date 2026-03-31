import { test, expect } from "@playwright/test";
import {
  skipUnlessPspConfigured,
  navigateToShopAndAddFirstProduct,
  navigateToCheckout,
  fillCheckoutShippingInfo,
  selectPaymentProvider,
  clickPayButton,
  expectOrderConfirmation,
} from "../helpers/checkout";

/**
 * Stripe checkout flow E2E test.
 * Requires E2E_STRIPE_API_KEY env var with a Stripe test-mode key.
 * Uses Stripe's test card numbers for sandbox transactions.
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
      test.skip(true, "Stripe payment option not visible on checkout page");
      return;
    }

    const stripeFrame = page.frameLocator("iframe[name*='stripe']").first();
    const cardInput = stripeFrame.locator("[name='cardnumber'], [placeholder*='card']").first();

    if (await cardInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await cardInput.fill("4242424242424242");
      const expiryInput = stripeFrame.locator("[name='exp-date'], [placeholder*='MM']").first();
      await expiryInput.fill("12/30");
      const cvcInput = stripeFrame.locator("[name='cvc'], [placeholder*='CVC']").first();
      await cvcInput.fill("123");
    }

    await clickPayButton(page);
    await expectOrderConfirmation(page);
  });

  test("Stripe checkout handles declined card", async ({ page }) => {
    await navigateToShopAndAddFirstProduct(page);
    await navigateToCheckout(page);
    await fillCheckoutShippingInfo(page);

    const selected = await selectPaymentProvider(page, "stripe");
    if (!selected) {
      test.skip(true, "Stripe payment option not visible on checkout page");
      return;
    }

    const stripeFrame = page.frameLocator("iframe[name*='stripe']").first();
    const cardInput = stripeFrame.locator("[name='cardnumber'], [placeholder*='card']").first();

    if (await cardInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await cardInput.fill("4000000000000002");
      const expiryInput = stripeFrame.locator("[name='exp-date'], [placeholder*='MM']").first();
      await expiryInput.fill("12/30");
      const cvcInput = stripeFrame.locator("[name='cvc'], [placeholder*='CVC']").first();
      await cvcInput.fill("123");
    }

    await clickPayButton(page);

    await expect(
      page.getByText(/declined|failed|error|unable/i).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});
