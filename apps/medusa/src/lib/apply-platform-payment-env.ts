import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const BYOK_TIMEOUT_MS = Number(process.env.BYOK_BOOT_TIMEOUT_MS) || 15_000;

/**
 * When PAYMENT_CREDENTIALS_SOURCE is `platform` or `supabase`, loads secrets
 * from Supabase `payment_connections` into `process.env` (PSPs and Aftership courier BYOK)
 * so medusa-config uses the same ciphertext as Admin. Values override keys
 * already set from `.env` for the same variable names.
 *
 * This is the required integration shape: Medusa v2 `medusa-config.ts` and
 * payment modules read `process.env` when building provider options. Replacing
 * env with an in-memory secret handle would require Medusa or plugin APIs to
 * accept injectable credential resolvers (upstream change).
 *
 * Timeout: defaults to 15 s (override via BYOK_BOOT_TIMEOUT_MS).
 * On failure: logs a fatal-level warning and continues with file-based env
 * so Medusa can still boot in degraded mode rather than crashing on transient
 * Supabase latency.
 */
export function applyPlatformPaymentCredentialsFromSupabaseSync(): void {
  const src = process.env.PAYMENT_CREDENTIALS_SOURCE?.trim().toLowerCase();
  if (src !== "platform" && src !== "supabase") return;

  const script = resolve(process.cwd(), "src/scripts/emit-platform-payment-env.ts");

  let out: string;
  try {
    out = execFileSync(process.execPath, ["--import", "tsx/esm", script], {
      encoding: "utf8",
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
      cwd: process.cwd(),
      timeout: BYOK_TIMEOUT_MS,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes("ETIMEDOUT") || msg.includes("timed out");
    const isProd = process.env.NODE_ENV === "production";
    const safeDetail = isProd
      ? isTimeout
        ? "Supabase timed out"
        : "subprocess_failed"
      : msg;
    console.error(
      `[BYOK] FATAL: Failed to load platform payment credentials — ${safeDetail}. ` +
        "Medusa will continue with file-based .env credentials (if any). " +
        "Set BYOK_BOOT_TIMEOUT_MS to increase timeout or fix Supabase connectivity.",
    );
    return;
  }

  const trimmed = out.trim();
  if (!trimmed) return;

  let vars: Record<string, string | undefined>;
  try {
    vars = JSON.parse(trimmed) as Record<string, string | undefined>;
  } catch {
    console.error(
      "[BYOK] FATAL: emit-platform-payment-env returned invalid JSON. " +
        "Medusa will continue with file-based .env credentials.",
    );
    return;
  }

  let applied = 0;
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === "string" && v.length > 0) {
      process.env[k] = v;
      applied++;
    }
  }

  if (applied > 0) {
    console.log(`[BYOK] Applied ${applied} platform payment credential(s) from Supabase.`);
    if (process.env.NODE_ENV === "production") {
      console.log(
        "[BYOK] Env hygiene: keep PSP secrets out of plaintext deployment env files when using platform BYOK; Supabase rows are the source of truth.",
      );
    }
  }
}
