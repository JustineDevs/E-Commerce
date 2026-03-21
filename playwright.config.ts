import { defineConfig, devices } from "@playwright/test";

/** Local dev default. Deployed preview: https://maharlika-apparel-custom.vercel.app */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: "pnpm --filter @apparel-commerce/api dev",
          url: process.env.PLAYWRIGHT_API_URL ?? "http://localhost:4000/health",
          reuseExistingServer: true,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
        },
        {
          command: "pnpm --filter @apparel-commerce/storefront dev",
          url: baseURL,
          reuseExistingServer: true,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
        },
        {
          command: "pnpm --filter @apparel-commerce/admin dev",
          url: "http://localhost:3001",
          reuseExistingServer: true,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
        },
      ],
  timeout: 60_000,
});
