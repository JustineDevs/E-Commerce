import { test, expect } from "@playwright/test";

const adminBase =
  process.env.PLAYWRIGHT_ADMIN_URL ?? "http://localhost:3001";

function firstAdminAllowedEmail(): string | undefined {
  const raw = process.env.ADMIN_ALLOWED_EMAILS?.trim();
  if (!raw) return undefined;
  const first = raw.split(",")[0]?.trim().toLowerCase();
  return first || undefined;
}

/**
 * Staff dashboard via E2E credentials. Same env as production admin: first email in
 * ADMIN_ALLOWED_EMAILS and NEXTAUTH_SECRET as password; run pnpm e2e:ensure-staff once.
 */
test.describe("Admin E2E credentials", () => {
  test("staff reaches /admin after E2E credential sign-in", async ({
    page,
  }) => {
    const email = firstAdminAllowedEmail();
    const password = process.env.NEXTAUTH_SECRET;
    await page.goto(`${adminBase}/sign-in/e2e`, { waitUntil: "domcontentloaded" });
    const form = page.getByTestId("e2e-credentials-form");
    if ((await form.count()) === 0) {
      test.skip(
        true,
        "E2E credentials UI not available (use /sign-in/e2e in development with ADMIN_ALLOWED_EMAILS + NEXTAUTH_SECRET). Run pnpm e2e:ensure-staff for Supabase user.",
      );
    }
    if (!email || !password?.trim()) {
      test.skip(
        true,
        "Set ADMIN_ALLOWED_EMAILS and NEXTAUTH_SECRET in root .env for Playwright (loaded by playwright.config).",
      );
    }

    await expect(form).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("e2e-admin-email").fill(email);
    await page.getByTestId("e2e-admin-password").fill(password);
    await page.getByTestId("e2e-admin-submit").click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 45_000 });
  });
});
