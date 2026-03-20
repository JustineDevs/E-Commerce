import type { NextFunction, Request, Response } from "express";

const LEGACY_GONE =
  process.env.LEGACY_COMMERCE_API_DISABLED === "true" ||
  process.env.LEGACY_COMMERCE_API_DISABLED === "1";

const GONE_PREFIXES = [
  "/checkout",
  "/products",
  "/public/orders",
  "/webhooks/lemonsqueezy",
  "/webhooks/aftership",
  "/orders",
  "/inventory",
  "/barcode",
  "/payments",
  "/shipments",
];

export function legacyCommerceGate(req: Request, res: Response, next: NextFunction) {
  if (!LEGACY_GONE) {
    next();
    return;
  }
  const p = req.path.startsWith("/") ? req.path : `/${req.path}`;
  for (const prefix of GONE_PREFIXES) {
    if (p === prefix || p.startsWith(`${prefix}/`)) {
      res.status(410).json({
        error: "Legacy commerce API disabled",
        code: "LEGACY_COMMERCE_GONE",
      });
      return;
    }
  }
  next();
}
