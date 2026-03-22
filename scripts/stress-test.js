#!/usr/bin/env node

/**
 * Stress-test orchestration - runs all test types across the application.
 * Aligned with skills: e2e-testing, dogfood, design-with-taste, core-engineering, owasp-security.
 *
 * Phases:
 *  1. Lint
 *  2. Security check (sensitive files)
 *  3. Audit (dependency vulnerabilities - OWASP)
 *  4. Unit/integration + Medusa stress
 *  5. E2E (Playwright smoke, flows)
 *  6. Dogfood (visual screenshots)
 *
 * Usage: node scripts/stress-test.js [options]
 *   --no-lint       Skip lint
 *   --no-security   Skip security check
 *   --no-audit      Skip pnpm audit
 *   --no-test       Skip unit/integration/medusa tests
 *   --no-e2e        Skip E2E (requires dev servers)
 *   --no-dogfood    Skip dogfood screenshots
 */

const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

const phases = [
  {
    id: "lint",
    name: "Lint",
    cmd: ["pnpm", "lint"],
    skipFlag: "--no-lint",
  },
  {
    id: "security",
    name: "Security check (sensitive files)",
    cmd: ["pnpm", "security:check"],
    skipFlag: "--no-security",
  },
  {
    id: "audit",
    name: "Dependency audit (OWASP)",
    cmd: ["pnpm", "audit"],
    skipFlag: "--no-audit",
  },
  {
    id: "test",
    name: "Unit / integration / Medusa stress",
    cmd: ["pnpm", "test"],
    skipFlag: "--no-test",
  },
  {
    id: "e2e",
    name: "E2E (Playwright)",
    cmd: ["node", "scripts/run-e2e.js"],
    skipFlag: "--no-e2e",
  },
  {
    id: "dogfood",
    name: "Dogfood (visual screenshots)",
    cmd: ["node", "scripts/run-e2e.js", "dogfood", "--project=chromium"],
    skipFlag: "--no-dogfood",
  },
];

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
  const args = process.argv.slice(2);
  const skipSet = new Set(args.filter((a) => a.startsWith("--no-")));

  console.log("\n🧪 Stress-test: full application\n");

  for (const phase of phases) {
    if (skipSet.has(phase.skipFlag)) {
      console.log(`⏭️  Skipping: ${phase.name}\n`);
      continue;
    }

    console.log(`\n━━━ ${phase.name} ━━━\n`);
    const code = run(phase.cmd);
    if (code !== 0) {
      console.error(`\n❌ ${phase.name} failed (exit ${code})`);
      process.exit(code);
    }
  }

  console.log("\n✅ All stress-test phases passed.\n");
}

main();
