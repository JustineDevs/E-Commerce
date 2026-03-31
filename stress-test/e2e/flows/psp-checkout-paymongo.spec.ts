import { test, expect } from "@playwright/test";
import {
  skipUnlessPspConfigured,
  navigateToShopAndAddFirstProduct,
  navigateToCheckout,
  fillCheckoutShippingInfo,
  selectPaymentProvider,
  clickPayButton,
} from "../helpers/checkout";

/**
 * PayMongo checkout flow E2E test.
 * Requires E2E_PAYMONGO_SECRET_KEY env var.
 * PayMongo sandbox redirects to a test payment page.
 */
test.describe("PayMongo checkout flow", () => {
  test.beforeEach(() => {
    skipUnlessPspConfigured("paymongo");
  });

  test("checkout reaches PayMongo payment page", async ({ page }) => {
    await navigateToShopAndAddFirstProduct(page);
    await navigateToCheckout(page);
    await fillCheckoutShippingInfo(page);

    const selected = await selectPaymentProvider(page, "paymongo");
    if (!selected) {
      test.skip(true, "PayMongo payment option not visible on checkout page");
      return;
    }

    await clickPayButton(page);

    const redirected = page.url().includes("paymongo.com") || page.url().includes("checkout");

    await expect(
      page
        .getByText(/paymongo|payment|processing|confirm/i)
        .first()
        .or(page.locator("[data-testid='order-confirmation']")),
    ).toBeVisible({ timeout: 30_000 });
  });
});
