/**
 * Centralized env-driven limits for optional Express or proxy gateways.
 * Medusa store limits are configured in `apps/medusa/src/api/middlewares.ts`.
 */

export function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

/** Legacy env CHECKOUT_INTENT_PER_MIN, else RATE_LIMIT_CHECKOUT_INTENT_MAX, else default. */
export function readCheckoutIntentMaxPerWindow(): number {
  const legacy = process.env.CHECKOUT_INTENT_PER_MIN?.trim();
  if (legacy) {
    const n = Number(legacy);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return readPositiveIntEnv("RATE_LIMIT_CHECKOUT_INTENT_MAX", 24);
}

export function readCheckoutBurstMaxPerWindow(): number {
  const legacy = process.env.CHECKOUT_BURST_PER_MIN?.trim();
  if (legacy) {
    const n = Number(legacy);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return readPositiveIntEnv("RATE_LIMIT_CHECKOUT_BURST_MAX", 8);
}

export function readCheckoutMaxPerLongWindow(): number {
  const legacy = process.env.CHECKOUT_MAX_PER_15MIN?.trim();
  if (legacy) {
    const n = Number(legacy);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return readPositiveIntEnv("RATE_LIMIT_CHECKOUT_MAX", 30);
}

export function readPublicTrackMaxPerWindow(): number {
  const legacy = process.env.PUBLIC_TRACK_RATE_MAX?.trim();
  if (legacy) {
    const n = Number(legacy);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return readPositiveIntEnv("RATE_LIMIT_PUBLIC_TRACK_MAX", 60);
}

export function expressWebhookRateLimitOptions(): {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
} {
  return {
    windowMs: readPositiveIntEnv("RATE_LIMIT_WEBHOOK_WINDOW_MS", 60_000),
    max: readPositiveIntEnv("RATE_LIMIT_WEBHOOK_MAX", 300),
    standardHeaders: true,
    legacyHeaders: false,
  };
}

export function expressCheckoutIntentRateLimitOptions(): {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
} {
  return {
    windowMs: readPositiveIntEnv("RATE_LIMIT_CHECKOUT_INTENT_WINDOW_MS", 60_000),
    max: readCheckoutIntentMaxPerWindow(),
    standardHeaders: true,
    legacyHeaders: false,
  };
}

export function expressCheckoutBurstRateLimitOptions(): {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
} {
  return {
    windowMs: readPositiveIntEnv("RATE_LIMIT_CHECKOUT_BURST_WINDOW_MS", 60_000),
    max: readCheckoutBurstMaxPerWindow(),
    standardHeaders: true,
    legacyHeaders: false,
  };
}

export function expressCheckoutWindowRateLimitOptions(): {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
} {
  return {
    windowMs: readPositiveIntEnv("RATE_LIMIT_CHECKOUT_WINDOW_MS", 15 * 60_000),
    max: readCheckoutMaxPerLongWindow(),
    standardHeaders: true,
    legacyHeaders: false,
  };
}

export function expressCatalogRateLimitOptions(): {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
} {
  return {
    windowMs: readPositiveIntEnv("RATE_LIMIT_CATALOG_WINDOW_MS", 60_000),
    max: readPositiveIntEnv("RATE_LIMIT_CATALOG_MAX", 120),
    standardHeaders: true,
    legacyHeaders: false,
  };
}

export function expressPublicTrackRateLimitOptions(): {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
} {
  return {
    windowMs: readPositiveIntEnv("RATE_LIMIT_PUBLIC_TRACK_WINDOW_MS", 60_000),
    max: readPublicTrackMaxPerWindow(),
    standardHeaders: true,
    legacyHeaders: false,
  };
}
