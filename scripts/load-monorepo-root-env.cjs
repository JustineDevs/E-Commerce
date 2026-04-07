/**
 * Load repo-root `.env` / `.env.local` into `process.env` before Next reads config.
 * Used by apps/storefront and apps/admin `next.config.*` only.
 *
 * Kept under `scripts/` (not `stress-test/`) so production and CI builds never depend on test-only paths.
 */
const fs = require("fs");
const path = require("path");

function loadMonorepoRootEnv(fromConfigDir) {
  const root = path.resolve(fromConfigDir, "../..");
  const env = path.join(root, ".env");
  const envLocal = path.join(root, ".env.local");
  const invalidationKey = "STOREFRONT_INTERNAL_INVALIDATION_SECRET";
  const invalidationBefore = process.env[invalidationKey];
  if (fs.existsSync(env)) {
    require("dotenv").config({ path: env });
  }
  if (fs.existsSync(envLocal)) {
    require("dotenv").config({ path: envLocal, override: true });
  }
  if (invalidationBefore?.trim() && !process.env[invalidationKey]?.trim()) {
    process.env[invalidationKey] = invalidationBefore;
  }
}

module.exports = { loadMonorepoRootEnv };
