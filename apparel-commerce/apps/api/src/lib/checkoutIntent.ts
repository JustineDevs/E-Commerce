import crypto from "crypto";
import { resolveApiHmacSecret } from "./trackingToken.js";

const AAD = "checkout-intent-v1";

function resolveIntentSecret(): string {
  const dedicated = process.env.CHECKOUT_INTENT_SECRET?.trim();
  if (dedicated) return dedicated;
  return resolveApiHmacSecret();
}

type IntentPayload = { v: number; exp: number; jti: string };

const consumedJti = new Map<string, number>();
const MAX_JTI_ENTRIES = 50_000;

function pruneJti(nowMs: number): void {
  if (consumedJti.size < MAX_JTI_ENTRIES) return;
  const horizon = nowMs - 86_400_000;
  for (const [k, expMs] of consumedJti) {
    if (expMs < horizon) consumedJti.delete(k);
  }
  if (consumedJti.size >= MAX_JTI_ENTRIES) {
    consumedJti.clear();
  }
}

function signPayload(payloadB64: string): string {
  return crypto.createHmac("sha256", resolveIntentSecret()).update(`${AAD}|${payloadB64}`).digest("hex");
}

export function mintCheckoutIntent(): { intentToken: string; expiresInSeconds: number } {
  const ttl = Math.min(Math.max(parseInt(process.env.CHECKOUT_INTENT_TTL_SECONDS ?? "300", 10) || 300, 60), 900);
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const jti = crypto.randomBytes(16).toString("hex");
  const body: IntentPayload = { v: 1, exp, jti };
  const payloadB64 = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = signPayload(payloadB64);
  return { intentToken: `${payloadB64}.${sig}`, expiresInSeconds: ttl };
}

export function verifyAndConsumeCheckoutIntent(token: string | undefined): { ok: true; jti: string } | { ok: false } {
  if (!token || typeof token !== "string") {
    return { ok: false };
  }
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return { ok: false };
  const payloadB64 = token.slice(0, dot);
  const sigHex = token.slice(dot + 1);
  if (!/^[0-9a-f]+$/i.test(sigHex)) return { ok: false };

  const expectedHex = signPayload(payloadB64);
  try {
    const a = Buffer.from(expectedHex, "utf8");
    const b = Buffer.from(sigHex, "utf8");
    if (a.length !== b.length) return { ok: false };
    if (!crypto.timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }

  let parsed: IntentPayload;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as IntentPayload;
  } catch {
    return { ok: false };
  }

  if (parsed.v !== 1 || typeof parsed.exp !== "number" || typeof parsed.jti !== "string" || !/^[0-9a-f]{32}$/i.test(parsed.jti)) {
    return { ok: false };
  }

  const now = Math.floor(Date.now() / 1000);
  if (parsed.exp < now) return { ok: false };

  const nowMs = Date.now();
  pruneJti(nowMs);
  if (consumedJti.has(parsed.jti)) return { ok: false };
  consumedJti.set(parsed.jti, parsed.exp * 1000);
  return { ok: true, jti: parsed.jti };
}
