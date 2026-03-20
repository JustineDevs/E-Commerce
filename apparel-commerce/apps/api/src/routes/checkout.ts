import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { performLemonSqueezyCheckoutFromItems } from "../lib/webCheckout.js";
import { sendCheckoutTrackingEmail } from "../lib/checkoutEmail.js";
import { mintCheckoutIntent, verifyAndConsumeCheckoutIntent } from "../lib/checkoutIntent.js";
import { logSecurityEvent } from "../lib/securityEvent.js";

export const checkoutRouter: ReturnType<typeof Router> = Router();

const checkoutIntentLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.CHECKOUT_INTENT_PER_MIN ?? 24),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent("rate_limit_checkout_intent", req, { window: "60s" });
    res.status(429).json({ error: "Too many checkout sessions", code: "RATE_LIMIT" });
  },
});

const checkoutBurstLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.CHECKOUT_BURST_PER_MIN ?? 8),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent("rate_limit_checkout_burst", req, { window: "60s" });
    res.status(429).json({ error: "Too many requests", code: "RATE_LIMIT" });
  },
});

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: Number(process.env.CHECKOUT_MAX_PER_15MIN ?? 30),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent("rate_limit_checkout_window", req, { window: "15m" });
    res.status(429).json({ error: "Too many requests", code: "RATE_LIMIT" });
  },
});

checkoutRouter.get("/intent", checkoutIntentLimiter, (_req, res) => {
  try {
    const { intentToken, expiresInSeconds } = mintCheckoutIntent();
    res.json({ intentToken, expiresInSeconds });
  } catch {
    res.status(503).json({ error: "Checkout session unavailable", code: "INTENT_DISABLED" });
  }
});

checkoutRouter.post("/", checkoutBurstLimiter, checkoutLimiter, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const intentToken = typeof body.intentToken === "string" ? body.intentToken : undefined;
    const consumed = verifyAndConsumeCheckoutIntent(intentToken);
    if (!consumed.ok) {
      logSecurityEvent("checkout_intent_rejected", req, { reason: "invalid_expired_or_replay" });
      res.status(403).json({ error: "Invalid or expired checkout session", code: "INVALID_CHECKOUT_INTENT" });
      return;
    }

    const items = body.items as Array<{ variantId?: string; quantity?: number }> | undefined;
    const email = typeof body.email === "string" ? body.email : undefined;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items required", code: "INVALID_CHECKOUT" });
      return;
    }

    const out = await performLemonSqueezyCheckoutFromItems({ items: items as { variantId: string; quantity: number }[], email });

    const origin = (
      process.env.PUBLIC_STOREFRONT_URL?.trim() ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const trackingPath = `/track/${encodeURIComponent(out.orderId)}?t=${encodeURIComponent(out.trackingToken)}`;
    const trackingUrl = `${origin}${trackingPath}`;

    if (email?.trim()) {
      void sendCheckoutTrackingEmail({
        to: email.trim(),
        orderNumber: out.orderNumber,
        trackingUrl,
      }).catch((err) => {
        console.error("CHECKOUT_EMAIL_ASYNC", err);
      });
    }

    res.status(201).json({
      checkoutUrl: out.checkoutUrl,
      orderId: out.orderId,
      orderNumber: out.orderNumber,
      trackingToken: out.trackingToken,
    });
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "INSUFFICIENT_STOCK") {
        res.status(409).json({ error: "Insufficient stock", code: "INSUFFICIENT_STOCK" });
        return;
      }
      if (e.message === "EMPTY_CART" || e.message === "INVALID_VARIANT") {
        res.status(400).json({ error: e.message, code: "INVALID_CHECKOUT" });
        return;
      }
      if (e.message === "NO_WAREHOUSE") {
        res.status(503).json({ error: "Inventory location not configured", code: "NO_WAREHOUSE" });
        return;
      }
      if (e.message === "PAYMENTS_DISABLED") {
        res.status(503).json({ error: "Lemon Squeezy is not configured", code: "PAYMENTS_DISABLED" });
        return;
      }
    }
    next(e);
  }
});
