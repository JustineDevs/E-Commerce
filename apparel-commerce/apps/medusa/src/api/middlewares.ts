import { randomUUID } from "node:crypto";
import { defineMiddlewares } from "@medusajs/framework/http";
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

const WINDOW_MS = 60_000;
const MAX = Math.max(
  1,
  Number.parseInt(process.env.MEDUSA_STORE_RATE_LIMIT_MAX ?? "120", 10) || 120,
);

const buckets = new Map<string, { count: number; reset: number }>();

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

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store*",
      middlewares: [requestCorrelationId, storeRateLimit],
    },
  ],
});
