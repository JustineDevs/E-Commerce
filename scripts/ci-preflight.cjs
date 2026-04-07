#!/usr/bin/env node
/**
 * Local CI preflight before `pnpm commit`: Node/native runtime check, then Turbo lint, typecheck, test.
 * Optional Python (black / isort / mypy) on `services/orchestrator` when that directory exists and tools are on PATH.
 * Set PREFLIGHT_SKIP_PYTHON=1 to skip Python. Set PREFLIGHT_SKIP_RUNTIME_CHECK=1 to skip esbuild runtime check.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function run(label, command, args, env = process.env) {
  console.log(`\n━━━ ${label} ━━━\n`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env,
  });
  return result.status ?? 1;
}

/** spawnSync without shell so paths with spaces (e.g. repo folder name) are not split on Windows. */
function runExec(label, file, args, env = process.env) {
  console.log(`\n━━━ ${label} ━━━\n`);
  const result = spawnSync(file, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env,
  });
  return result.status ?? 1;
}

function commandExists(cmd) {
  const bin = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(bin, [cmd], { encoding: "utf8", shell: true });
  return r.status === 0;
}

if (process.env.PREFLIGHT_SKIP_RUNTIME_CHECK !== "1") {
  const rt = path.join(root, "stress-test", "scripts", "check-test-runtime.cjs");
  if (fs.existsSync(rt)) {
    const code = runExec("Node 20 + esbuild native runtime", process.execPath, [rt, "esbuild"]);
    if (code !== 0) {
      process.exit(code);
    }
  }
}

{
  const code = run(
    "turbo: lint + typecheck + test",
    "pnpm",
    ["exec", "turbo", "run", "lint", "typecheck", "test", "--continue"],
  );
  if (code !== 0) {
    process.exit(code);
  }
}

const orch = path.join(root, "services", "orchestrator");
if (process.env.PREFLIGHT_SKIP_PYTHON === "1" || !fs.existsSync(orch)) {
  process.exit(0);
}

if (commandExists("black")) {
  const code = run("black (check)", "black", ["--check", orch]);
  if (code !== 0) {
    process.exit(code);
  }
}
if (commandExists("isort")) {
  const code = run("isort (check)", "isort", ["--check", "--profile", "black", orch]);
  if (code !== 0) {
    process.exit(code);
  }
}
if (commandExists("mypy")) {
  const req = path.join(orch, "requirements-mypy.txt");
  const args = fs.existsSync(req)
    ? ["--install-types", "--non-interactive", "-p", orch, "--python-executable", "python3"]
    : [orch];
  const code = run("mypy", "mypy", args);
  if (code !== 0) {
    process.exit(code);
  }
}

process.exit(0);
