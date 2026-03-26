"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const rel = process.argv[2] || "apps/storefront";
const nextDir = path.join(root, rel, ".next");

if (!fs.existsSync(nextDir)) {
  process.exit(0);
}

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
} catch (err) {
  const code = err && typeof err === "object" && "code" in err ? err.code : "";
  if (code === "EPERM" || code === "EBUSY") {
    console.error(
      `[clean-next-dir] Cannot remove ${rel}/.next (${code}). Stop Next.js dev for this app (pnpm dev), close editors holding .next, then run the build again.`,
    );
  } else {
    console.error("[clean-next-dir]", err);
  }
  process.exit(1);
}
