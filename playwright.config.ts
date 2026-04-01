import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

process.env.NODE_ENV = process.env.NODE_ENV ?? "development";
loadEnv({ path: resolve(process.cwd(), ".env"), override: false });

/**
 * Root `.env` often sets NODE_ENV=production for deploy docs. `next dev` must run as
 * development or it looks for `.next/required-server-files.json` and fails with ENOENT.
 */
function nextDevServerEnv(): NodeJS.ProcessEnv {
  return { ...process.env, NODE_ENV: "development" };
}

/**
 * Root `.env` usually sets NEXTAUTH_URL to the storefront (3000). Admin on 3001 must use
 * its own URL or NextAuth cookies/session never match and sign-in stays on /sign-in.
 */
function storefrontDevServerEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "development",
    NEXTAUTH_URL:
      process.env.PLAYWRIGHT_STOREFRONT_NEXTAUTH_URL ?? "http://localhost:3000",
  };
}

function adminDevServerEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "development",
    NEXTAUTH_URL: process.env.PLAYWRIGHT_ADMIN_NEXTAUTH_URL ?? "http://localhost:3001",
  };
}

/** Local dev default. Deployed preview: https://maharlika-apparel-custom.vercel.app */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/**
 * Playwright treats the server as "already up" only when this URL returns 2xx–3xx (<404).
 * The storefront home page can be 404/500 during compile or misconfig; `/api/health` stays stable JSON 200.
 */
const storefrontWebServerUrl =
  process.env.PLAYWRIGHT_STOREFRONT_WEBSERVER_URL ??
  new URL("/api/health", baseURL).toString();

const reuseDevServer = !process.env.CI;

export default defineConfig({
  testDir: "./stress-test/e2e",
  outputDir: "./stress-test/test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never", outputFolder: "stress-test/playwright-report" }], ["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    /** Catalog + cold Next compile can exceed 60s under parallel load; helpers wait up to 90s for PDP. */
    navigationTimeout: 120_000,
    actionTimeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: "**/storefront-api-security-rate-limit.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-rate-limit",
      testMatch: "**/storefront-api-security-rate-limit.spec.ts",
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: "pnpm --filter medusa dev",
          url: process.env.PLAYWRIGHT_MEDUSA_URL ?? "http://localhost:9000/health",
          reuseExistingServer: reuseDevServer,
          timeout: 180_000,
          stdout: "pipe",
          stderr: "pipe",
        },
        {
          command: "pnpm --filter @apparel-commerce/api dev",
          url: process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000/health",
          reuseExistingServer: reuseDevServer,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
          env: {
            ...process.env,
            INTERNAL_API_KEY: process.env.INTERNAL_API_KEY ?? "e2e-internal-key",
          },
        },
        {
          command: "pnpm --filter @apparel-commerce/storefront dev",
          url: storefrontWebServerUrl,
          reuseExistingServer: reuseDevServer,
          timeout: 240_000,
          stdout: "pipe",
          stderr: "pipe",
          env: storefrontDevServerEnv(),
        },
        {
          command: "pnpm --filter @apparel-commerce/admin dev",
          url: "http://localhost:3001",
          reuseExistingServer: reuseDevServer,
          timeout: 240_000,
          stdout: "pipe",
          stderr: "pipe",
          env: adminDevServerEnv(),
        },
      ],
  /** Per-test ceiling must exceed PDP / shop waits (see stress-test/e2e/helpers/storefront.ts). */
  timeout: 180_000,
});
