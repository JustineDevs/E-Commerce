/**
 * Load repo-root env files into `process.env` before Next reads config.
 * Order: `.env` then `.env.local` (override), matching Next.js precedence for local overrides.
 * Used by apps/storefront and apps/admin next.config.*
 */
const fs = require("fs");
const path = require("path");

function loadMonorepoRootEnv(fromConfigDir) {
  const root = path.resolve(fromConfigDir, "../..");
  const env = path.join(root, ".env");
  const envLocal = path.join(root, ".env.local");
  if (fs.existsSync(env)) {
    require("dotenv").config({ path: env });
  }
  if (fs.existsSync(envLocal)) {
    require("dotenv").config({ path: envLocal, override: true });
  }
}

module.exports = { loadMonorepoRootEnv };
