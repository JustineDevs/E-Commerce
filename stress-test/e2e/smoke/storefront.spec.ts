import { test, expect } from "@playwright/test";

import { gotoFirstCatalogPdp } from "../helpers/storefront";

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

  test("product PDP loads from catalog (first listed product)", async ({ page }) => {
    const slug = await gotoFirstCatalogPdp(page);
    if (!slug) {
      test.skip(
        true,
        "No products in Medusa for this region. Run: pnpm --filter medusa seed && pnpm --filter medusa seed:ph (ensure NEXT_PUBLIC_MEDUSA_REGION_ID matches the PH region).",
      );
    }
    const addBtn = page.getByTestId("pdp-add-to-bag");
    await expect(addBtn).toBeVisible({ timeout: 30_000 });
    await expect(addBtn).toBeEnabled();
  });
});
