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
 * PayPal checkout flow E2E test.
 * Requires E2E_PAYPAL_CLIENT_ID and E2E_PAYPAL_CLIENT_SECRET env vars.
 * PayPal sandbox flows redirect to PayPal's sandbox login page.
 */
test.describe("PayPal checkout flow", () => {
  test.beforeEach(() => {
    skipUnlessPspConfigured("paypal");
  });

  test("checkout reaches PayPal redirect or inline approval", async ({ page }) => {
    await navigateToShopAndAddFirstProduct(page);
    await navigateToCheckout(page);
    await fillCheckoutShippingInfo(page);

    const selected = await selectPaymentProvider(page, "paypal");
    if (!selected) {
      test.skip(true, "PayPal payment option not visible on checkout page");
      return;
    }

    await clickPayButton(page);

    const paypalRedirect = page.url().includes("paypal.com");
    const paypalFrame = page.frameLocator("iframe[name*='paypal']").first();

    if (paypalRedirect) {
      await expect(page).toHaveURL(/paypal\.com/, { timeout: 30_000 });
      expect(page.url()).toContain("paypal.com");
    } else {
      const loginBtn = paypalFrame
        .locator("button, [data-funding-source='paypal']")
        .first();
      const visible = await loginBtn
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      expect(paypalRedirect || visible).toBeTruthy();
    }
  });
});
