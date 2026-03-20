import { Router } from "express";
import { performLemonSqueezyCheckoutFromItems } from "../lib/webCheckout.js";
import { requireInternalApiKey } from "../lib/requireInternalApiKey.js";

export const paymentsRouter: ReturnType<typeof Router> = Router();

paymentsRouter.use(requireInternalApiKey);

paymentsRouter.post("/pos-checkout", async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const items = body.items as Array<{ variantId?: string; quantity?: number }> | undefined;
    const email = typeof body.email === "string" ? body.email : undefined;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items required", code: "INVALID_CHECKOUT" });
      return;
    }

    const out = await performLemonSqueezyCheckoutFromItems({
      items: items as { variantId: string; quantity: number }[],
      email,
    });
    res.status(201).json(out);
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
