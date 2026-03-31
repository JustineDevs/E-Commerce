import { randomUUID } from "node:crypto";
import { defineMiddlewares } from "@medusajs/framework/http";
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

/**
 * Same semantics as `@apparel-commerce/rate-limits` (Medusa backend compiles as CJS; that package is ESM-only).
 */
function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

const WINDOW_MS = 60_000;
const MAX = Math.max(
  1,
  Number.parseInt(process.env.MEDUSA_STORE_RATE_LIMIT_MAX ?? "120", 10) || 120,
);

const buckets = new Map<string, { count: number; reset: number }>();
const checkoutBuckets = new Map<string, { count: number; reset: number }>();

const CHECKOUT_POST_MAX = readPositiveIntEnv("RATE_LIMIT_STORE_CHECKOUT_POST_MAX", 60);
const CHECKOUT_WINDOW_MS = readPositiveIntEnv(
  "RATE_LIMIT_STORE_CHECKOUT_POST_WINDOW_MS",
  60_000,
);

function clientKey(req: MedusaRequest): string {
  const xff = req.headers["x-forwarded-for"];
  const first =
    typeof xff === "string"
      ? xff.split(",")[0]?.trim()
      : Array.isArray(xff)
        ? xff[0]
        : "";
  if (first) {
    return first;
  }
  const socket = (req as MedusaRequest & { socket?: { remoteAddress?: string } })
    .socket;
  return socket?.remoteAddress ?? "unknown";
}

function requestCorrelationId(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && incoming.trim().length > 0
      ? incoming.trim()
      : randomUUID();
  res.setHeader("x-request-id", id);
  next();
}

function storeRateLimit(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) {
  const ip = clientKey(req);
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + WINDOW_MS };
    buckets.set(ip, b);
  }
  b.count += 1;
  res.setHeader("X-RateLimit-Limit", String(MAX));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, MAX - b.count)));
  if (b.count > MAX) {
    res.status(429).json({ message: "Too many requests", code: "RATE_LIMIT" });
    return;
  }
  next();
}

/**
 * Extra velocity limit for POST /store/carts and /store/payment-collections (checkout intent).
 * Complements the general /store limit; keyed by client IP only (body not parsed here).
 */
function storeCheckoutPostRateLimit(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) {
  if (req.method !== "POST") {
    next();
    return;
  }
  const path = String(
    (req as MedusaRequest & { originalUrl?: string }).originalUrl ??
      req.url ??
      "",
  );
  if (
    !path.includes("/store/carts") &&
    !path.includes("/store/payment-collections")
  ) {
    next();
    return;
  }
  const ip = clientKey(req);
  const key = `checkout-post:${ip}`;
  const now = Date.now();
  let b = checkoutBuckets.get(key);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + CHECKOUT_WINDOW_MS };
    checkoutBuckets.set(key, b);
  }
  b.count += 1;
  res.setHeader("X-Checkout-RateLimit-Limit", String(CHECKOUT_POST_MAX));
  res.setHeader(
    "X-Checkout-RateLimit-Remaining",
    String(Math.max(0, CHECKOUT_POST_MAX - b.count)),
  );
  if (b.count > CHECKOUT_POST_MAX) {
    console.error(
      "[checkout-velocity] blocked ip=",
      ip,
      "path=",
      path.slice(0, 120),
    );
    res.status(429).json({
      message: "Too many checkout requests",
      code: "CHECKOUT_VELOCITY",
    });
    return;
  }
  next();
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store*",
      middlewares: [
        requestCorrelationId,
        storeRateLimit,
        storeCheckoutPostRateLimit,
      ],
    },
  ],
});
