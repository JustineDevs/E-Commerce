import { createClient } from "@supabase/supabase-js";

import { mapPaymentSecretJsonKeyToEnvVar } from "./payment-provider-secret-env-map";

export type ByokHealthStatus = {
  loaded: boolean;
  source: "platform" | "file" | "none";
  appliedCount: number;
  lastLoadedAt: string | null;
  error: string | null;
  /** Enabled or sandbox_verified rows considered in the last successful fetch path. */
  connectionsEligible: number;
  /** Rows whose ciphertext could not be decrypted in the last run. */
  decryptFailures: number;
  /**
   * True when operators should investigate: Supabase error, any decrypt failure,
   * or platform mode with eligible connections but zero env keys applied.
   */
  operatorAlertRecommended: boolean;
};

let _status: ByokHealthStatus = {
  loaded: false,
  source: "none",
  appliedCount: 0,
  lastLoadedAt: null,
  error: null,
  connectionsEligible: 0,
  decryptFailures: 0,
  operatorAlertRecommended: false,
};

export function getByokHealthStatus(): ByokHealthStatus {
  return { ..._status };
}

const BYOK_POLL_INTERVAL_MS =
  Number(process.env.BYOK_LAZY_POLL_INTERVAL_MS) || 300_000;
const BYOK_TIMEOUT_MS = Number(process.env.BYOK_BOOT_TIMEOUT_MS) || 15_000;

async function fetchAndApply(): Promise<void> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    _status = {
      loaded: false,
      source: "file",
      appliedCount: 0,
      lastLoadedAt: null,
      error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set",
      connectionsEligible: 0,
      decryptFailures: 0,
      operatorAlertRecommended: true,
    };
    return;
  }

  const { decryptJsonEnvelope } = await import(
    "@apparel-commerce/payment-connection-crypto"
  );

  const sb = createClient(url, key);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BYOK_TIMEOUT_MS);

  try {
    const { data, error } = await sb
      .from("payment_connections")
      .select(
        "id,provider,region_id,status,secret_ciphertext,updated_at,mode",
      );

    clearTimeout(timeout);

    if (error) {
      _status = {
        loaded: false,
        source: "file",
        appliedCount: 0,
        lastLoadedAt: null,
        error: `Supabase query failed: ${error.message}`,
        connectionsEligible: 0,
        decryptFailures: 0,
        operatorAlertRecommended: true,
      };
      console.error("[BYOK-async] Supabase query failed (code redacted)");
      return;
    }

    const rows = (data ?? []).filter(
      (r: { status?: string }) =>
        r.status === "enabled" || r.status === "sandbox_verified",
    );

    const connectionsEligible = rows.length;
    let decryptFailures = 0;

    const env: Record<string, string> = {};

    for (const row of rows) {
      const r = row as {
        provider: string;
        secret_ciphertext: string;
        status: string;
        region_id: string | null;
        updated_at: string;
        mode: string;
      };

      try {
        const secrets = (await decryptJsonEnvelope(
          r.secret_ciphertext,
        )) as Record<string, string | undefined>;

        for (const [k, v] of Object.entries(secrets)) {
          if (typeof v === "string" && v.length > 0) {
            const envKey = mapPaymentSecretJsonKeyToEnvVar(r.provider, k);
            if (envKey) env[envKey] = v;
          }
        }
        if (r.provider === "maya") {
          env.MAYA_SANDBOX = r.mode === "production" ? "false" : "true";
        }
      } catch {
        decryptFailures += 1;
        console.error(
          `[BYOK-async] Failed to decrypt provider=${r.provider} connection (error redacted)`,
        );
      }
    }

    let applied = 0;
    for (const [k, v] of Object.entries(env)) {
      process.env[k] = v;
      applied++;
    }

    const zeroKeysWithRows =
      connectionsEligible > 0 && applied === 0 && decryptFailures === 0;

    _status = {
      loaded: true,
      source: "platform",
      appliedCount: applied,
      lastLoadedAt: new Date().toISOString(),
      error: null,
      connectionsEligible,
      decryptFailures,
      operatorAlertRecommended:
        decryptFailures > 0 ||
        zeroKeysWithRows,
    };

    if (applied > 0) {
      console.log(
        `[BYOK-async] Applied ${applied} platform payment credential(s) from Supabase.`,
      );
    }
    if (zeroKeysWithRows) {
      console.warn(
        "[BYOK-async] Eligible payment_connections rows produced no env keys; check secret field mapping.",
      );
    }
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    _status = {
      loaded: false,
      source: "file",
      appliedCount: 0,
      lastLoadedAt: null,
      error: msg,
      connectionsEligible: 0,
      decryptFailures: 0,
      operatorAlertRecommended: true,
    };
    const isProd = process.env.NODE_ENV === "production";
    console.error(
      `[BYOK-async] Failed to load credentials: ${isProd ? "error_redacted" : msg}`,
    );
  }
}

let _pollTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Async alternative to `applyPlatformPaymentCredentialsFromSupabaseSync`.
 * Decrypted values are written to `process.env` using the same key names as
 * the sync `emit-platform-payment-env` path (`payment-provider-secret-env-map`).
 * Medusa payment modules read those env vars; there is no supported in-process
 * secret provider hook without upstream framework changes.
 *
 * Loads credentials on first call, then refreshes on a configurable interval
 * (default 5 min via BYOK_LAZY_POLL_INTERVAL_MS).
 *
 * Use this when Medusa startup SLO matters and you prefer degraded-then-ready
 * over blocking boot on Supabase availability.
 */
export async function applyPlatformPaymentCredentialsAsync(): Promise<void> {
  const src = process.env.PAYMENT_CREDENTIALS_SOURCE?.trim().toLowerCase();
  if (src !== "platform" && src !== "supabase") {
    _status = {
      loaded: false,
      source: "file",
      appliedCount: 0,
      lastLoadedAt: null,
      error: null,
      connectionsEligible: 0,
      decryptFailures: 0,
      operatorAlertRecommended: false,
    };
    return;
  }

  await fetchAndApply();

  if (!_pollTimer) {
    _pollTimer = setInterval(() => {
      fetchAndApply().catch((e) => {
        const isProd = process.env.NODE_ENV === "production";
        console.error(
          `[BYOK-async] Background refresh failed: ${isProd ? "error_redacted" : e instanceof Error ? e.message : String(e)}`,
        );
      });
    }, BYOK_POLL_INTERVAL_MS);

    if (_pollTimer && typeof _pollTimer === "object" && "unref" in _pollTimer) {
      (_pollTimer as NodeJS.Timeout).unref();
    }
  }
}

export function stopByokPolling(): void {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}
