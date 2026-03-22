import { test, expect } from "@playwright/test";

test.describe("Medusa-oriented storefront probes", () => {
  test("health/sop reports medusa commerce source", async ({ request }) => {
    const res = await request.get("/api/health/sop");
    const json = (await res.json()) as { commerceSource?: string };
    expect(json.commerceSource).toBe("medusa");
  });

  test("checkout page still loads for Medusa-only flow", async ({ page }) => {
    await page.goto("/checkout");
    await expect(
      page.getByRole("heading", { name: /checkout/i }),
    ).toBeVisible();
  });
});
