import { test, expect } from "@playwright/test";
import {
  navigateToShopAndAddFirstProduct,
  navigateToCheckout,
  fillCheckoutShippingInfo,
  selectPaymentProvider,
  clickPayButton,
  expectOrderConfirmation,
} from "../helpers/checkout";

function shouldFailOnMissingPrereq(): boolean {
  return process.env.CI_STRICT_E2E === "1" || process.env.CI === "true";
}

/**
 * COD (Cash on Delivery) checkout flow E2E test.
 * This must prove server-owned order placement, not only button clicks.
 */
test.describe("COD checkout flow", () => {
  test("complete checkout with Cash on Delivery", async ({ page }) => {
    await navigateToShopAndAddFirstProduct(page);
    await navigateToCheckout(page);
    await fillCheckoutShippingInfo(page);

    const selected = await selectPaymentProvider(page, "cod");
    if (!selected) {
      if (shouldFailOnMissingPrereq()) {
        throw new Error("COD payment option is not visible during strict E2E validation.");
      }
      test.skip(true, "COD payment option not visible on checkout page");
      return;
    }

    await clickPayButton(page);
    await expectOrderConfirmation(page);
    await expect(page).toHaveURL(/\/track\/order_/i, { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /order/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/status:\s*pending payment/i)).toBeVisible({
      timeout: 30_000,
    });
  });
});
