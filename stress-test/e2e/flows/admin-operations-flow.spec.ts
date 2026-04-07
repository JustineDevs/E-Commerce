import { test, expect } from "@playwright/test";
import { adminBase, e2eAdminLogin } from "../helpers/admin-e2e-auth";

/**
 * One authenticated pass through primary admin surfaces (runs once per full stress / E2E run).
 * Order matches common ops: dashboard, commerce, POS, content, settings, platform.
 */
const ADMIN_OPERATION_PATHS: readonly string[] = [
  "/admin",
  "/admin/orders",
  "/admin/inventory",
  "/admin/catalog",
  "/admin/pos",
  "/admin/cms",
  "/admin/settings/payments",
  "/admin/workflow",
  "/admin/devices",
  "/admin/reviews",
  "/admin/loyalty",
  "/admin/employees",
  "/admin/campaigns",
  "/admin/analytics",
  "/admin/crm",
  "/admin/channels",
  "/admin/offline-queue",
  "/admin/receipts",
  "/admin/audit",
  "/admin/chat-orders",
  "/admin/settings/integrations",
  "/admin/settings/preferences",
  "/admin/settings/storefront",
  "/admin/finance/reconciliation",
];

test.describe.configure({ mode: "serial" });

test.describe("@admin Admin operations E2E", () => {
  test("authenticated stress pass over core routes", async ({ page }) => {
    /** Serial pass over many routes; dev cold compile can exceed default 180s. */
    test.setTimeout(300_000);
    const login = await e2eAdminLogin(page);
    if (login === "skip_no_ui") {
      test.skip(
        true,
        "E2E credentials UI missing. Use /sign-in/e2e with ADMIN_ALLOWED_EMAILS + NEXTAUTH_SECRET. Run pnpm e2e:ensure-staff.",
      );
    }
    if (login === "skip_no_env") {
      test.skip(
        true,
        "Set ADMIN_ALLOWED_EMAILS and NEXTAUTH_SECRET in root .env (Playwright loads via playwright.config).",
      );
    }

    for (const path of ADMIN_OPERATION_PATHS) {
      await test.step(path, async () => {
        await page.goto(`${adminBase}${path}`, {
          waitUntil: "domcontentloaded",
          timeout: 120_000,
        });

        await expect(page).not.toHaveURL(/\/sign-in(\/|$|\?)|\/api\/auth\/signin/i, {
          timeout: 15_000,
        });

        const bodyText = await page.locator("body").innerText();
        expect(bodyText).not.toMatch(/Application error|Unhandled Runtime Error/i);

        const pathname = new URL(page.url()).pathname.replace(/\/$/, "") || "/";
        const target = path.replace(/\/$/, "") || "/";
        const onPath = pathname === target || pathname.startsWith(`${target}/`);
        expect(onPath, `Expected to load ${path}; got ${page.url()} (run pnpm e2e:ensure-staff for * grants).`).toBeTruthy();
      });
    }
  });
});
