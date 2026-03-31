import { test, expect } from "@playwright/test";

import { gotoFirstCatalogPdp } from "../helpers/storefront";

/**
 * End-to-end commerce paths (guest): SOP, catalog, PDP, bag affordance, checkout shell.
 * Payment capture and PSP redirects stay out of scope here; use staging QA for providers.
 */
test.describe("Full commerce journey (guest)", () => {
  test("commerce SOP reports Medusa", async ({ request }) => {
    const res = await request.get("/api/health/sop");
    expect(res.ok(), `/api/health/sop ${res.status()}`).toBeTruthy();
    const json = (await res.json()) as { commerceSource?: string };
    expect(json.commerceSource).toBe("medusa");
  });

  test("shop to first PDP and add-to-bag when catalog exists", async ({ page }) => {
    const slug = await gotoFirstCatalogPdp(page);
    if (!slug) {
      test.skip(
        true,
        "No catalog products. Run: node scripts/e2e-prep-medusa.mjs (Medusa must be stopped or DB lock OK).",
      );
    }
    await expect(page.getByTestId("pdp-add-to-bag")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("pdp-add-to-bag")).toBeEnabled();
  });

  test("checkout page loads with pay control", async ({ page }) => {
    await page.goto("/checkout");
    await expect(
      page.getByRole("heading", { name: /checkout/i }),
    ).toBeVisible();
    await expect(page.getByTestId("checkout-submit-pay")).toBeVisible();
  });

  test("sign-in page loads for account flows", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /sign/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});
