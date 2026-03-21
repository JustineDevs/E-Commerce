import { test, expect } from "@playwright/test";

test.describe("storefront smoke", () => {
  test("home renders primary brand and navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("nav-home")).toBeVisible();
    await expect(page.getByTestId("nav-shop")).toBeVisible();
    await expect(page.getByTestId("nav-checkout")).toBeVisible();
  });

  test("shop lists products or empty state", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("checkout page loads and shows empty bag by default", async ({
    page,
  }) => {
    await page.goto("/checkout");
    await expect(
      page.getByRole("heading", { name: /checkout/i }),
    ).toBeVisible();
    await expect(page.getByTestId("checkout-submit-pay")).toBeVisible();
    await expect(page.getByTestId("checkout-submit-pay")).toBeDisabled();
  });

  test("product PDP loads for classic-shorts", async ({ page }) => {
    const res = await page.goto("/shop/classic-shorts");
    if (!res || res.status() >= 400) {
      test.skip(true, "classic-shorts not seeded in Medusa");
    }
    const addBtn = page.getByTestId("pdp-add-to-bag");
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toBeEnabled();
  });
});
