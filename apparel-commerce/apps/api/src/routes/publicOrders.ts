import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import {
  createSupabaseClient,
  getOrderById,
  getOrderByNumber,
  getShipmentsByOrderId,
} from "@apparel-commerce/database";
import { isTrackingTokenConfigured, verifyOrderTrackingToken } from "../lib/trackingToken.js";
import { logSecurityEvent } from "../lib/securityEvent.js";

export const publicOrdersRouter: ReturnType<typeof Router> = Router();

const publicTrackLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.PUBLIC_TRACK_RATE_MAX ?? 60),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent("rate_limit_public_track", req, { window: "60s" });
    res.status(429).json({ error: "Too many requests", code: "RATE_LIMIT" });
  },
});

publicOrdersRouter.use(publicTrackLimiter);

publicOrdersRouter.get("/:identifier", async (req, res) => {
  if (!isTrackingTokenConfigured()) {
    res.status(503).json({ error: "Tracking is not configured", code: "TRACKING_MISCONFIGURED" });
    return;
  }

  const { identifier } = req.params;
  const token = typeof req.query.t === "string" ? req.query.t : undefined;
  const raw = decodeURIComponent(identifier.trim());

  const isUuid = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(raw);

  const supabase = createSupabaseClient();
  const order = isUuid ? await getOrderById(supabase, raw) : await getOrderByNumber(supabase, raw);

  if (!order) {
    res.status(404).json({ error: "Not found", code: "TRACK_NOT_FOUND" });
    return;
  }

  if (!verifyOrderTrackingToken(order.id, token)) {
    res.status(404).json({ error: "Not found", code: "TRACK_NOT_FOUND" });
    return;
  }

  const shipments = await getShipmentsByOrderId(supabase, order.id);
  res.json({ order, shipments });
});
