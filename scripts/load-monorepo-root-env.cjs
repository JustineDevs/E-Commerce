/**
 * Load repo-root `.env` / `.env.local` into `process.env` before Next reads config.
 * Used by apps/storefront and apps/admin `next.config.*` only.
 *
 * Kept under `scripts/` (not `stress-test/`) so production and CI builds never depend on test-only paths.
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

/**
 * Apply vars from a root env file without letting `NODE_ENV` leak into the Next.js process.
 * Repo `.env` often documents `NODE_ENV=production` for deploys; `dotenv.config({ override: true })`
 * would overwrite the value Next sets for `next dev` / `next build` and breaks CSS compilation.
 */
function envValueUnset(key) {
  const v = process.env[key];
  return v === undefined || String(v).trim() === "";
}

function readEnvFileUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
}

function applyRootEnvFile(filePath, overrideExisting) {
  if (!fs.existsSync(filePath)) return;
  const parsed = dotenv.parse(readEnvFileUtf8(filePath));
  for (const [key, value] of Object.entries(parsed)) {
    if (key === "NODE_ENV") continue;
    if (overrideExisting) {
      if (String(value).trim() === "") {
        continue;
      }
      process.env[key] = value;
      continue;
    }
    if (envValueUnset(key)) {
      process.env[key] = value;
    }
  }
}

function loadMonorepoRootEnv(fromConfigDir) {
  const root = path.resolve(fromConfigDir, "../..");
  const env = path.join(root, ".env");
  const envLocal = path.join(root, ".env.local");
  const invalidationKey = "STOREFRONT_INTERNAL_INVALIDATION_SECRET";
  const invalidationBefore = process.env[invalidationKey];
  applyRootEnvFile(env, false);
  applyRootEnvFile(envLocal, true);
  if (invalidationBefore?.trim() && !process.env[invalidationKey]?.trim()) {
    process.env[invalidationKey] = invalidationBefore;
  }
}

module.exports = { loadMonorepoRootEnv };
