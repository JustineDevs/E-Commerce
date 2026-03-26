#!/usr/bin/env node

/**
 * Release gate — runs all automatable checks from the Same-Day Release Board.
 * Exit 0 = all gates pass. Exit 1 = at least one gate failed.
 *
 * Gates:
 *  1. Runtime (Node 20 required; lint, tests)
 *  2. Security (security check, audit triage)
 *  3. Data (database/platform tests)
 *  4. E2E (with --include-e2e: Playwright starts all 4 apps + runs E2E)
 *
 * Usage: node scripts/release-gate.js [--include-e2e]
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const includeE2e = process.argv.includes("--include-e2e");

const nodeMajor = parseInt(process.version.slice(1).split(".")[0], 10);
if (nodeMajor !== 20) {
  console.error(
    `\n🛑 Release gate requires Node 20. Current: ${process.version}. Use nvm use 20 or .nvmrc.\n`,
  );
  process.exit(1);
}

function run(cmd, args = []) {
  const [program, ...rest] = cmd;
  const result = spawnSync(program, [...rest, ...args], {
    stdio: "inherit",
    cwd: root,
    shell: true,
  });
  return result.status;
}

function main() {
  let failed = false;

  console.log("\n🚦 Release gate — Same-Day Release Board (automatable checks)\n");

  const checks = [
    { name: "Lint", cmd: ["pnpm", "lint"] },
    { name: "Build (turbo)", cmd: ["pnpm", "build"] },
    { name: "Security (sensitive files)", cmd: ["pnpm", "security:check"] },
    {
      name: "Audit (triage check; see internal/docs/audit-triage.md)",
      cmd: ["node", "scripts/check-audit-triage.js"],
    },
    {
      name: "Unit / integration / Medusa / database",
      cmd: ["pnpm", "test"],
    },
  ];

  for (const { name, cmd } of checks) {
    console.log(`\n━━━ ${name} ━━━\n`);
    const code = run(cmd);
    if (code !== 0) {
      console.error(`\n❌ ${name} failed (exit ${code})`);
      failed = true;
    }
  }

  if (includeE2e) {
    console.log("\n━━━ E2E (Playwright) ━━━\n");
    const code = run(["node", "scripts/run-e2e.js"]);
    if (code !== 0) {
      console.error("\n❌ E2E failed");
      failed = true;
    }
  } else {
    console.log(
      "\n⏭️  E2E skipped. For full proof: pnpm release-gate:full (starts all 4 apps + E2E).\n",
    );
  }

  if (failed) {
    console.error("\n🛑 Release gate FAILED. Do not ship.\n");
    process.exit(1);
  }
  const msg = includeE2e
    ? "\n✅ Release gate passed (full: automated + boot + E2E).\n"
    : "\n✅ Release gate passed. Run pnpm release-gate:full for boot + E2E before ship.\n";
  console.log(msg);
  process.exit(0);
}

main();
