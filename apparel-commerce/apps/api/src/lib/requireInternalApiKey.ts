import type { Request, Response, NextFunction } from "express";
import { logSecurityEvent } from "./securityEvent.js";

/**
 * Requires INTERNAL_API_KEY via Authorization: Bearer <key> or x-internal-api-key.
 * In production, the key must be set. In development, missing key skips auth (convenience only).
 */
export function requireInternalApiKey(req: Request, res: Response, next: NextFunction): void {
  const required = process.env.NODE_ENV === "production" || !!process.env.INTERNAL_API_KEY;
  if (!required) {
    next();
    return;
  }

  const key = process.env.INTERNAL_API_KEY;
  if (!key) {
    res.status(503).json({ error: "Server misconfigured", code: "MISSING_INTERNAL_API_KEY" });
    return;
  }

  const auth = req.headers.authorization;
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  const headerKey = req.headers["x-internal-api-key"];
  const provided = (typeof headerKey === "string" ? headerKey : undefined) ?? bearer;

  if (provided !== key) {
    logSecurityEvent("internal_api_key_rejected", req, {
      hadBearer: Boolean(bearer),
      hadHeaderKey: typeof headerKey === "string",
    });
    res.status(401).json({ error: "Unauthorized", code: "INVALID_INTERNAL_API_KEY" });
    return;
  }

  next();
}
