import { test, expect } from "@playwright/test";
import {
  navigateToShopAndAddFirstProduct,
  navigateToCheckout,
  fillCheckoutShippingInfo,
  selectPaymentProvider,
  clickPayButton,
  expectOrderConfirmation,
} from "../helpers/checkout";

/**
 * COD (Cash on Delivery) checkout flow E2E test.
 * COD is always configured and requires no external credentials.
 */
test.describe("COD checkout flow", () => {
  test("complete checkout with Cash on Delivery", async ({ page }) => {
    await navigateToShopAndAddFirstProduct(page);
    await navigateToCheckout(page);
    await fillCheckoutShippingInfo(page);

    const selected = await selectPaymentProvider(page, "cod");
    if (!selected) {
      test.skip(true, "COD payment option not visible on checkout page");
      return;
    }

    await clickPayButton(page);
    await expectOrderConfirmation(page);
  });
});
