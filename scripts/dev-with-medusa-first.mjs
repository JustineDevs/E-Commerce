/**
 * Starts Medusa first, waits until /health responds, then runs turbo dev for all
 * other packages. Avoids storefront/admin racing ahead of the commerce API.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import process from "node:process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

const healthUrl =
  process.env.MEDUSA_DEV_HEALTH_URL?.trim() ||
  `${(process.env.MEDUSA_BACKEND_URL || "http://127.0.0.1:9000").replace(/\/$/, "")}/health`;
const timeoutMs = Number(process.env.MEDUSA_DEV_WAIT_MS || 120_000);
const intervalMs = Number(process.env.MEDUSA_DEV_POLL_MS || 500);

function spawnPnpm(args, options = {}) {
  return spawn("pnpm", args, {
    cwd: root,
    stdio: "inherit",
    shell: isWin,
    env: process.env,
    ...options,
  });
}

async function waitForMedusaHealthy() {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3_000);
      const res = await fetch(healthUrl, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) return;
    } catch {
      // keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    `Medusa did not respond OK at ${healthUrl} within ${timeoutMs}ms. Fix Medusa errors in the log above, then retry.`,
  );
}

const medusa = spawnPnpm(["--filter", "medusa", "dev"]);

medusa.on("error", (err) => {
  console.error("[dev] failed to start medusa:", err.message);
  process.exit(1);
});

try {
  await waitForMedusaHealthy();
  console.error(`[dev] Medusa is up (${healthUrl}). Starting other dev servers...`);
} catch (e) {
  console.error(`[dev] ${e.message}`);
  medusa.kill("SIGTERM");
  process.exit(1);
}

const rest = spawnPnpm(["exec", "turbo", "dev", "--filter=!medusa"]);

rest.on("error", (err) => {
  console.error("[dev] failed to start turbo:", err.message);
  medusa.kill("SIGTERM");
  process.exit(1);
});

function shutdown(signal) {
  medusa.kill(signal);
  rest.kill(signal);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

medusa.on("exit", (code, sig) => {
  if (sig === "SIGINT" || sig === "SIGTERM") {
    process.exit(0);
  }
  if (code !== 0 && code !== null) {
    console.error(`[dev] medusa exited with code ${code}`);
    rest.kill("SIGTERM");
    process.exit(code);
  }
});

rest.on("exit", (code, sig) => {
  if (sig === "SIGINT" || sig === "SIGTERM") {
    medusa.kill("SIGTERM");
    process.exit(0);
  }
  medusa.kill("SIGTERM");
  process.exit(code ?? 0);
});
