#!/usr/bin/env node

/**
 * Fails if storefront client bundles could reference server-only secrets.
 * Checks source (not built .next output): "use client" files must not reference
 * MEDUSA_SECRET*, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_*SECRET patterns.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../apps/storefront/src");
const forbiddenInClient = [
  /MEDUSA_SECRET_API_KEY/,
  /MEDUSA_SECRET(?!_)/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /NEXT_PUBLIC_[A-Z0-9_]*SECRET/i,
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === ".next") continue;
      walk(p, out);
    } else if (/\.(tsx|ts|jsx|js)$/.test(name.name)) {
      out.push(p);
    }
  }
  return out;
}

function main() {
  if (!fs.existsSync(root)) {
    console.error("Missing apps/storefront/src");
    process.exit(1);
  }
  const files = walk(root);
  const failures = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const isClient = /^["']use client["']/m.test(text);
    if (!isClient) continue;
    for (const re of forbiddenInClient) {
      if (re.test(text)) {
        failures.push({ file, pattern: re.source });
      }
    }
  }
  if (failures.length > 0) {
    console.error(
      "\nStorefront client components must not reference server secrets:\n",
    );
    for (const f of failures) {
      console.error(`  ${path.relative(path.resolve(__dirname, ".."), f.file)} (${f.pattern})`);
    }
    console.error("");
    process.exit(1);
  }
  console.log("check-storefront-server-secrets: ok");
  process.exit(0);
}

main();
