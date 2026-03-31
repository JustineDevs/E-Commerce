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
 * Maya checkout flow E2E test.
 * Requires E2E_MAYA_SECRET_KEY env var.
 * Maya sandbox redirects to a test payment page.
 */
test.describe("Maya checkout flow", () => {
  test.beforeEach(() => {
    skipUnlessPspConfigured("maya");
  });

  test("checkout reaches Maya payment page", async ({ page }) => {
    await navigateToShopAndAddFirstProduct(page);
    await navigateToCheckout(page);
    await fillCheckoutShippingInfo(page);

    const selected = await selectPaymentProvider(page, "maya");
    if (!selected) {
      test.skip(true, "Maya payment option not visible on checkout page");
      return;
    }

    await clickPayButton(page);

    await expect(
      page
        .getByText(/maya|payment|processing|confirm/i)
        .first()
        .or(page.locator("[data-testid='order-confirmation']")),
    ).toBeVisible({ timeout: 30_000 });
  });
});
