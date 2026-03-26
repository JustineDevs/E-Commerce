type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 50_000;

function pruneIfNeeded(): void {
  if (buckets.size <= MAX_BUCKETS) return;
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now > b.resetAt) buckets.delete(k);
    if (buckets.size <= MAX_BUCKETS * 0.8) break;
  }
}

export function rateLimitFixedWindow(
  key: string,
  max: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  pruneIfNeeded();
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }
  b.count += 1;
  return { ok: true };
}

export function clientIpFromMedusaRequest(req: {
  headers?: Record<string, unknown>;
  ip?: string;
}): string {
  const rawForwarded = req.headers?.["x-forwarded-for"];
  const forwarded =
    typeof rawForwarded === "string"
      ? rawForwarded
      : Array.isArray(rawForwarded)
        ? rawForwarded[0]
        : "";
  if (typeof forwarded === "string" && forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = req.headers?.["x-real-ip"];
  if (typeof real === "string" && real.trim()) {
    return real.trim().slice(0, 128);
  }
  if (typeof req.ip === "string" && req.ip.trim()) {
    return req.ip.trim().slice(0, 128);
  }
  return "unknown";
}
