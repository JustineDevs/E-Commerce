import type { Page } from "@playwright/test";

/**
 * Opens /shop and navigates to the first product PDP using CatalogProductCard
 * `data-product-slug`. Returns the slug when the PDP responds with a success status.
 */
export async function gotoFirstCatalogPdp(page: Page): Promise<string | null> {
  await page.goto("/shop", { waitUntil: "load" });
  const first = page.locator("[data-product-slug]").first();
  try {
    await first.waitFor({ state: "visible", timeout: 90_000 });
  } catch {
    return null;
  }
  const slug = await first.getAttribute("data-product-slug");
  const trimmed = slug?.trim();
  if (!trimmed) return null;
  const res = await page.goto(`/shop/${trimmed}`, { waitUntil: "domcontentloaded" });
  if (!res) return null;
  if (res.status() >= 400) return null;
  return trimmed;
}
