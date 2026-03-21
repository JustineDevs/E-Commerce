import { test, expect } from "@playwright/test";

const adminBase =
  process.env.PLAYWRIGHT_ADMIN_URL ?? "http://localhost:3001";

test.describe("Admin access control", () => {
  test("unauthenticated visit to /admin is redirected away from dashboard", async ({
    page,
  }) => {
    await page.goto(`${adminBase}/admin`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/admin\/(orders|inventory|pos)/, {
      timeout: 5_000,
    });
    await expect(page).toHaveURL(/signin|sign-in|callback|error|auth/i, {
      timeout: 20_000,
    });
  });
});
