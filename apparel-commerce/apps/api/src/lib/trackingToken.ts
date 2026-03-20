import crypto from "crypto";

export function resolveApiHmacSecret(): string {
  const s = process.env.TRACKING_LINK_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV !== "production") {
    const fallback = process.env.INTERNAL_API_KEY?.trim();
    if (fallback) return fallback;
  }
  throw new Error("TRACKING_LINK_SECRET_OR_DEV_INTERNAL");
}

function getSecret(): string {
  return resolveApiHmacSecret();
}

export function isTrackingTokenConfigured(): boolean {
  if (process.env.TRACKING_LINK_SECRET?.trim()) return true;
  return process.env.NODE_ENV !== "production" && Boolean(process.env.INTERNAL_API_KEY?.trim());
}

export function signOrderTrackingToken(orderId: string): string {
  return crypto.createHmac("sha256", getSecret()).update(orderId).digest("hex");
}

export function verifyOrderTrackingToken(orderId: string, token: string | undefined): boolean {
  if (!token || !orderId) return false;
  try {
    const expected = signOrderTrackingToken(orderId);
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(token.trim(), "hex");
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
